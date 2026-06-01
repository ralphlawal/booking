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

async function calculateServerAmount({ service_id, business_slug, promo_code }) {
  if (!service_id || !business_slug) {
    const err = new Error('service_id and business_slug are required');
    err.status = 400;
    throw err;
  }

  const { rows } = await db.query(
    `SELECT s.id, s.name AS service_name, s.price, b.id AS business_id, b.name AS business_name
     FROM services s
     JOIN businesses b ON b.id = s.business_id
     WHERE s.id = $1 AND b.slug = $2 AND b.is_active = TRUE AND s.is_active = TRUE`,
    [service_id, String(business_slug).toLowerCase()]
  );
  const item = rows[0];
  if (!item) {
    const err = new Error('Service is not available for this business');
    err.status = 404;
    throw err;
  }

  const price = Math.max(0, parseFloat(item.price || 0));
  let discount = 0;
  let promoCode = null;

  if (promo_code?.trim()) {
    const today = new Date().toISOString().split('T')[0];
    const { rows: promoRows } = await db.query(
      `SELECT * FROM promo_codes
       WHERE business_id = $1 AND UPPER(code) = UPPER($2) AND is_active = TRUE
         AND (valid_from IS NULL OR valid_from <= $3)
         AND (valid_until IS NULL OR valid_until >= $3)
         AND (max_uses IS NULL OR uses_count < max_uses)`,
      [item.business_id, promo_code.trim(), today]
    );
    const promo = promoRows[0];
    if (!promo) {
      const err = new Error('Invalid or expired promo code');
      err.status = 400;
      throw err;
    }
    if (price < parseFloat(promo.min_order_amount || 0)) {
      const err = new Error(`Minimum order £${parseFloat(promo.min_order_amount || 0).toFixed(2)} required for this code`);
      err.status = 400;
      throw err;
    }
    discount = promo.type === 'percent'
      ? Math.round((price * parseFloat(promo.value || 0) / 100) * 100) / 100
      : Math.min(parseFloat(promo.value || 0), price);
    promoCode = promo.code;
  }

  const finalAmount = Math.max(0, Math.round((price - discount) * 100));
  return {
    ...item,
    price,
    discount,
    promoCode,
    amount_pence: finalAmount,
  };
}

// POST /api/payments/create-intent
// Called before booking is submitted — creates a PaymentIntent for the server-verified service price.
exports.createIntent = async (req, res) => {
  try {
    const { currency = 'gbp', idempotency_key, service_id, business_slug, promo_code } = req.body;
    const normalizedCurrency = String(currency || 'gbp').toLowerCase();
    if (!['gbp', 'eur', 'usd'].includes(normalizedCurrency)) {
      return res.status(400).json({ error: 'Unsupported payment currency' });
    }

    const amount = await calculateServerAmount({ service_id, business_slug, promo_code });
    if (amount.amount_pence < 50) {
      return res.status(400).json({ error: 'Online payment amount must be at least 50p' });
    }

    const stripe = getStripe();
    const createParams = {
      amount: amount.amount_pence,
      currency: normalizedCurrency,
      description: `${amount.service_name || 'Service'} at ${amount.business_name || 'BookAm Business'}`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        service_id,
        business_id: amount.business_id,
        business_slug,
        server_amount_pence: String(amount.amount_pence),
        ...(amount.promoCode ? { promo_code: amount.promoCode, discount_amount: amount.discount.toFixed(2) } : {}),
        ...(idempotency_key ? { booking_idempotency_key: idempotency_key } : {}),
      },
    };
    const requestOptions = idempotency_key ? { idempotencyKey: `booking-payment-${idempotency_key}` } : undefined;
    const intent = await stripe.paymentIntents.create(createParams, requestOptions);

    res.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount_pence: amount.amount_pence,
      discount_amount: amount.discount,
    });
  } catch (err) {
    console.error('[payments/create-intent]', err.message);
    const status = err.status || (err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500);
    res.status(status).json({ error: err.message || 'Failed to create payment', code: err.code });
  }
};

exports.calculateServerAmount = calculateServerAmount;

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
