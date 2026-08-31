const db = require('../config/database');
const crypto = require('crypto');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Stripe is not configured — set STRIPE_SECRET_KEY');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

function generateCode() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `GIFT-${seg()}-${seg()}`;
}

/* ── Admin: gift card management ─────────────────────────────────────────── */

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT gc.*,
              (SELECT json_agg(json_build_object(
                        'id', t.id, 'type', t.type, 'amount', t.amount,
                        'note', t.note, 'booking_id', t.booking_id, 'created_at', t.created_at)
                      ORDER BY t.created_at DESC)
               FROM gift_card_transactions t WHERE t.gift_card_id = gc.id) AS transactions
       FROM gift_cards gc
       WHERE gc.business_id = $1
       ORDER BY gc.created_at DESC LIMIT 200`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      initial_value, currency, recipient_name, recipient_email,
      sender_name, message, expires_days,
    } = req.body;
    if (!initial_value) return res.status(400).json({ error: 'initial_value required' });
    const value = parseFloat(initial_value);
    if (value <= 0) return res.status(400).json({ error: 'Value must be positive' });

    const code = generateCode();
    const expiresAt = expires_days
      ? new Date(Date.now() + parseInt(expires_days) * 86400 * 1000)
      : null;

    const { rows } = await db.query(
      `INSERT INTO gift_cards
         (id, business_id, code, initial_value, remaining_balance, currency,
          recipient_name, recipient_email, sender_name, message, status, expires_at, payment_status)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,'active',$10,'paid')
       RETURNING *`,
      [
        crypto.randomUUID(), req.business.id, code, value,
        (currency || 'gbp').toLowerCase(),
        recipient_name || null, recipient_email || null,
        sender_name || null, message || null,
        expiresAt,
      ]
    );

    // Record as "manually issued" (no payment required for admin-created cards)
    await db.query(
      `INSERT INTO gift_card_transactions (id, gift_card_id, type, amount, note)
       VALUES ($1,$2,'purchase',$3,'Manually issued by business')`,
      [crypto.randomUUID(), rows[0].id, value]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE gift_cards SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND business_id=$2 RETURNING *`,
      [req.params.id, req.business.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Gift card not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Public: purchase a gift card (customer pays via Stripe) ─────────────── */

exports.purchaseIntent = async (req, res) => {
  try {
    const {
      slug, initial_value, currency,
      recipient_name, recipient_email, sender_name, message, expires_days,
    } = req.body;

    if (!slug || !initial_value) {
      return res.status(400).json({ error: 'slug and initial_value required' });
    }
    const value = parseFloat(initial_value);
    if (value < 1) return res.status(400).json({ error: 'Minimum gift card value is £1' });

    const { rows: biz } = await db.query(
      'SELECT id, stripe_account_id, stripe_onboarding_complete FROM businesses WHERE slug=$1',
      [slug]
    );
    const business = biz[0];
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (!business.stripe_account_id || !business.stripe_onboarding_complete) {
      return res.status(503).json({
        error: 'This business has not enabled online payments yet.',
        code: 'BUSINESS_STRIPE_NOT_CONNECTED',
      });
    }

    const stripe = getStripe();
    const usedCurrency = (currency || 'gbp').toLowerCase();
    const amountPence = Math.round(value * 100);
    const feePercent = Math.max(0, Math.min(50, parseFloat(process.env.PLATFORM_FEE_PERCENT || '10')));
    const applicationFee = Math.round(amountPence * feePercent / 100);

    const code = generateCode();
    const expiresAt = expires_days
      ? new Date(Date.now() + parseInt(expires_days) * 86400 * 1000)
      : null;

    // Create the gift card record as pending
    const { rows: gcRows } = await db.query(
      `INSERT INTO gift_cards
         (id, business_id, code, initial_value, remaining_balance, currency,
          recipient_name, recipient_email, sender_name, message, status, expires_at, payment_status)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,'active',$10,'pending')
       RETURNING *`,
      [
        crypto.randomUUID(), business.id, code, value, usedCurrency,
        recipient_name || null, recipient_email || null,
        sender_name || null, message || null, expiresAt,
      ]
    );
    const giftCard = gcRows[0];

    const intent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: usedCurrency,
      description: `Gift card: ${code}`,
      automatic_payment_methods: { enabled: true },
      on_behalf_of: business.stripe_account_id,
      transfer_data: { destination: business.stripe_account_id },
      application_fee_amount: applicationFee,
      metadata: {
        gift_card_id: giftCard.id, gift_card_code: code,
        business_id: business.id,
        recipient_email: recipient_email || '',
      },
    });

    await db.query(
      'UPDATE gift_cards SET stripe_payment_intent_id=$1 WHERE id=$2',
      [intent.id, giftCard.id]
    );

    res.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      gift_card_id: giftCard.id,
      code,
      amount_pence: amountPence,
    });
  } catch (err) {
    console.error('[giftCard/purchaseIntent]', err.message);
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
};

exports.confirmPurchase = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    if (!payment_intent_id) return res.status(400).json({ error: 'payment_intent_id required' });

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ error: 'Payment has not completed yet' });
      }
    }

    const { rows } = await db.query(
      `UPDATE gift_cards SET payment_status='paid', updated_at=NOW()
       WHERE stripe_payment_intent_id=$1 RETURNING *`,
      [payment_intent_id]
    );
    const gc = rows[0];
    if (!gc) return res.status(404).json({ error: 'Gift card not found' });

    await db.query(
      `INSERT INTO gift_card_transactions (id, gift_card_id, type, amount, note)
       VALUES ($1,$2,'purchase',$3,'Purchased online')
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), gc.id, gc.initial_value]
    );

    res.json(gc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Validate gift card code (at checkout) ───────────────────────────────── */

exports.validate = async (req, res) => {
  try {
    const { code, slug } = req.query;
    if (!code || !slug) return res.status(400).json({ error: 'code and slug required' });

    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [slug]);
    if (!biz.length) return res.json({ valid: false });

    const { rows } = await db.query(
      `SELECT id, code, remaining_balance, currency, status, expires_at
       FROM gift_cards
       WHERE UPPER(code) = UPPER($1) AND business_id=$2 AND payment_status='paid'`,
      [code.trim(), biz[0].id]
    );
    const gc = rows[0];
    if (!gc || gc.status !== 'active') return res.json({ valid: false, reason: 'Invalid or inactive gift card code' });
    if (gc.expires_at && new Date(gc.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'This gift card has expired' });
    }
    if (parseFloat(gc.remaining_balance) <= 0) {
      return res.json({ valid: false, reason: 'This gift card has no remaining balance' });
    }

    res.json({
      valid: true,
      gift_card_id: gc.id,
      code: gc.code,
      remaining_balance: parseFloat(gc.remaining_balance),
      currency: gc.currency,
      expires_at: gc.expires_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Internal: apply gift card to a booking (debit balance) ──────────────── */

exports.applyToBooking = async (giftCardId, bookingId, amount) => {
  try {
    const debit = Math.abs(parseFloat(amount));
    const { rows } = await db.query(
      `UPDATE gift_cards
       SET remaining_balance = GREATEST(0, remaining_balance - $1),
           status = CASE WHEN remaining_balance - $1 <= 0 THEN 'redeemed' ELSE status END,
           updated_at = NOW()
       WHERE id=$2 AND status='active' AND remaining_balance >= 0
       RETURNING remaining_balance`,
      [debit, giftCardId]
    );
    if (!rows.length) return false;

    await db.query(
      `INSERT INTO gift_card_transactions (id, gift_card_id, booking_id, type, amount, note)
       VALUES ($1,$2,$3,'redemption',$4,'Applied to booking')`,
      [crypto.randomUUID(), giftCardId, bookingId, -debit]
    );
    return true;
  } catch (err) {
    console.error('[giftCard/applyToBooking]', err.message);
    return false;
  }
};
