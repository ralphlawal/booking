const db = require('../config/database');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// POST /api/payments/create-intent
// Called before booking is submitted — creates a PaymentIntent for the service price.
exports.createIntent = async (req, res) => {
  try {
    const { amount_pence, currency = 'gbp', business_name, service_name } = req.body;
    if (!amount_pence || amount_pence < 50)
      return res.status(400).json({ error: 'amount_pence must be at least 50' });

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount_pence),
      currency,
      description: `${service_name || 'Service'} at ${business_name || 'BookAm Business'}`,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ client_secret: intent.client_secret, payment_intent_id: intent.id });
  } catch (err) {
    console.error('[payments/create-intent]', err.message);
    res.status(500).json({ error: err.message || 'Failed to create payment' });
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
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
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

  res.json({ received: true });
};
