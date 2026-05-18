const db = require('../config/database');
const crypto = require('crypto');

const GC_BASE = process.env.GOCARDLESS_ENV === 'live'
  ? 'https://api.gocardless.com'
  : 'https://api-sandbox.gocardless.com';

const GC_TOKEN = process.env.GOCARDLESS_ACCESS_TOKEN;

async function gcRequest(method, path, body) {
  if (!GC_TOKEN) throw new Error('GOCARDLESS_ACCESS_TOKEN not configured');
  const res = await fetch(`${GC_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GC_TOKEN}`,
      'GoCardless-Version': '2015-07-06',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `GoCardless error ${res.status}`);
  return data;
}

// POST /api/payments/mandate  — consumer initiates mandate for a booking
exports.createMandate = async (req, res) => {
  try {
    const { booking_id, consumer_id, business_id, amount_pence, return_url } = req.body;
    if (!business_id || !amount_pence)
      return res.status(400).json({ error: 'business_id and amount_pence required' });

    // Create GoCardless billing request
    const brData = await gcRequest('POST', '/billing_requests', {
      billing_requests: {
        mandate_request: { scheme: 'bacs' },
      },
    });

    const billingRequestId = brData.billing_requests?.id;

    // Create billing request flow (get redirect URL)
    const flowData = await gcRequest('POST', '/billing_request_flows', {
      billing_request_flows: {
        redirect_uri: return_url || `${process.env.FRONTEND_URL}/customer/dashboard`,
        exit_uri:     `${process.env.FRONTEND_URL}/customer/dashboard`,
        billing_request: { id: billingRequestId },
      },
    });

    const authorisationUrl = flowData.billing_request_flows?.authorisation_url;

    // Save mandate record
    const mandateId = crypto.randomUUID();
    await db.query(
      `INSERT INTO payment_mandates (id, booking_id, consumer_id, business_id, gc_billing_request_id, amount_pence, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_mandate')`,
      [mandateId, booking_id || null, consumer_id || null, business_id, billingRequestId, amount_pence]
    );

    // Link mandate to booking if provided
    if (booking_id) {
      await db.query('UPDATE bookings SET mandate_id = $1 WHERE id = $2', [mandateId, booking_id]);
    }

    res.json({ mandate_id: mandateId, authorisation_url: authorisationUrl });
  } catch (err) {
    console.error('[payments/mandate]', err.message);
    res.status(500).json({ error: err.message || 'Failed to create mandate' });
  }
};

// GET /api/payments/mandate/:bookingId
exports.getMandateForBooking = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM payment_mandates WHERE booking_id = $1',
      [req.params.bookingId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mandate' });
  }
};

// POST /api/payments/charge/:mandateId  — business charges a no-show
exports.chargeNoShow = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM payment_mandates WHERE id = $1',
      [req.params.mandateId]
    );
    const mandate = rows[0];
    if (!mandate) return res.status(404).json({ error: 'Mandate not found' });
    if (!mandate.gc_mandate_id)
      return res.status(400).json({ error: 'Mandate not yet activated — customer has not completed setup' });
    if (mandate.status === 'charged')
      return res.status(409).json({ error: 'Already charged' });

    const { description } = req.body;

    const payData = await gcRequest('POST', '/payments', {
      payments: {
        amount: mandate.amount_pence,
        currency: 'GBP',
        description: description || 'No-show charge',
        links: { mandate: mandate.gc_mandate_id },
      },
    });

    const gcPaymentId = payData.payments?.id;
    await db.query(
      `UPDATE payment_mandates SET gc_payment_id = $1, status = 'charged', updated_at = NOW() WHERE id = $2`,
      [gcPaymentId, mandate.id]
    );

    res.json({ success: true, gc_payment_id: gcPaymentId });
  } catch (err) {
    console.error('[payments/charge]', err.message);
    res.status(500).json({ error: err.message || 'Charge failed' });
  }
};

// POST /api/payments/webhook  — GoCardless event webhook
exports.webhook = async (req, res) => {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers['webhook-signature'];
    const expected = require('crypto')
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (sig !== expected) return res.status(401).send('Invalid signature');
  }

  const events = req.body?.events || [];
  for (const event of events) {
    try {
      if (event.resource_type === 'mandates' && event.action === 'active') {
        const gcMandateId = event.links?.mandate;
        const gcBillingRequestId = event.links?.billing_request;
        if (gcBillingRequestId) {
          await db.query(
            `UPDATE payment_mandates SET gc_mandate_id = $1, status = 'active', updated_at = NOW()
             WHERE gc_billing_request_id = $2`,
            [gcMandateId, gcBillingRequestId]
          );
        }
      }
    } catch (err) {
      console.error('[gc-webhook] event processing error:', err.message);
    }
  }
  res.status(200).send('ok');
};
