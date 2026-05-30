const db = require('../config/database');
const Notification = require('../models/Notification');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Online payments are not configured');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// POST /api/payments/create-intent
// Called before booking is submitted — creates a PaymentIntent for the service price.
exports.createIntent = async (req, res) => {
  try {
    const { amount_pence, currency = 'gbp', business_name, service_name, idempotency_key } = req.body;
    if (!amount_pence || amount_pence < 50)
      return res.status(400).json({ error: 'amount_pence must be at least 50' });

    const stripe = getStripe();
    const createParams = {
      amount: Math.round(amount_pence),
      currency,
      description: `${service_name || 'Service'} at ${business_name || 'BookAm Business'}`,
      automatic_payment_methods: { enabled: true },
      metadata: idempotency_key ? { booking_idempotency_key: idempotency_key } : undefined,
    };
    const requestOptions = idempotency_key ? { idempotencyKey: `booking-payment-${idempotency_key}` } : undefined;
    const intent = await stripe.paymentIntents.create(createParams, requestOptions);

    res.json({ client_secret: intent.client_secret, payment_intent_id: intent.id });
  } catch (err) {
    console.error('[payments/create-intent]', err.message);
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message || 'Failed to create payment', code: err.code });
  }
};

// GET /api/payments/booking/:bookingId
exports.getForBooking = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT stripe_payment_intent_id, payment_status FROM bookings WHERE id = $1',
      [req.params.bookingId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment info' });
  }
};

// POST /api/payments/webhook — Stripe sends events here
exports.webhook = async (req, res) => {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    return res.status(status).json({ error: err.message || 'Stripe webhook unavailable', code: err.code });
  }
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'Stripe webhook is not configured' });
  }

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body);
  } catch (err) {
    console.error('[stripe-webhook] signature error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    try {
      await db.query(
        `UPDATE bookings SET payment_status = 'paid', stripe_payment_intent_id = $1
         WHERE stripe_payment_intent_id = $2`,
        [pi.id, pi.id]
      );
      const { rows } = await db.query(
        `SELECT b.reference_id, b.consumer_id, b.booking_date, s.name AS service_name, bus.name AS business_name
         FROM bookings b
         LEFT JOIN services s ON s.id = b.service_id
         LEFT JOIN businesses bus ON bus.id = b.business_id
         WHERE b.stripe_payment_intent_id = $1`,
        [pi.id]
      );
      const row = rows[0];
      if (row?.consumer_id) {
        Notification.create({
          consumer_id: row.consumer_id,
          type: 'payment',
          title: 'Payment confirmed',
          body: `Your payment for ${row.service_name} at ${row.business_name} on ${row.booking_date} was successful.`,
          link: `/booking/success/${row.reference_id}`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[stripe-webhook] db update error:', err.message);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    try {
      await db.query(
        `UPDATE bookings SET payment_status = 'failed'
         WHERE stripe_payment_intent_id = $1`,
        [pi.id]
      );
    } catch (err) {
      console.error('[stripe-webhook] db update error:', err.message);
    }
  }

  // Auto-activate business Stripe accounts when Stripe verifies them.
  // Without this, stripe_onboarding_complete only updates when the business visits Settings.
  if (event.type === 'account.updated') {
    const acct = event.data.object;
    if (acct.charges_enabled && acct.payouts_enabled) {
      try {
        await db.query(
          'UPDATE businesses SET stripe_onboarding_complete = true WHERE stripe_account_id = $1',
          [acct.id]
        );
        console.log(`[stripe-webhook] account ${acct.id} marked active`);
      } catch (err) {
        console.error('[stripe-webhook] account.updated db error:', err.message);
      }
    }
  }

  // Sync refund status if a refund is created/updated directly on Stripe dashboard
  if (event.type === 'charge.refunded' || event.type === 'charge.refund.updated') {
    const charge = event.data.object;
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (piId) {
      try {
        const isFullRefund = charge.amount_refunded >= charge.amount;
        await db.query(
          `UPDATE bookings SET payment_status = $1
           WHERE stripe_payment_intent_id = $2 AND payment_status NOT IN ('refunded', 'partial_refund')`,
          [isFullRefund ? 'refunded' : 'partial_refund', piId]
        );
      } catch (err) {
        console.error('[stripe-webhook] refund sync error:', err.message);
      }
    }
  }

  res.json({ received: true });
};

// GET /api/payments/reconcile
// Checks Stripe for any paid-but-not-recorded payments and syncs them.
// Call from admin panel if a webhook was missed.
exports.reconcile = async (req, res) => {
  try {
    const stripe = getStripe();
    const { rows } = await db.query(`
      SELECT id, stripe_payment_intent_id
      FROM bookings
      WHERE stripe_payment_intent_id IS NOT NULL
        AND payment_status IN ('unpaid', 'failed')
      LIMIT 100
    `);

    let updated = 0;
    for (const booking of rows) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
        if (pi.status === 'succeeded') {
          await db.query(
            "UPDATE bookings SET payment_status = 'paid' WHERE id = $1 AND payment_status != 'paid'",
            [booking.id]
          );
          updated++;
        }
      } catch {}
    }

    res.json({ checked: rows.length, updated, message: `${updated} payment${updated === 1 ? '' : 's'} reconciled` });
  } catch (err) {
    console.error('[reconcile]', err.message);
    res.status(500).json({ error: 'Reconciliation failed' });
  }
};
