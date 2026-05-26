const db = require('../config/database');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Stripe is not configured on this server');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bookam.vercel.app';

// POST /api/business/me/stripe-connect/onboard
// Creates (or reuses) a Stripe Express account and returns an onboarding URL.
exports.onboard = async (req, res) => {
  try {
    const stripe = getStripe();
    const businessId = req.business.id;

    const { rows } = await db.query(
      'SELECT stripe_account_id FROM businesses WHERE id = $1',
      [businessId]
    );
    let accountId = rows[0]?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: req.business.bank_country || 'GB',
        email: req.user?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
      });
      accountId = account.id;
      await db.query(
        'UPDATE businesses SET stripe_account_id = $1, stripe_onboarding_complete = false WHERE id = $2',
        [accountId, businessId]
      );
    }

    const link = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${FRONTEND_URL}/admin/settings?tab=payouts&stripe=refresh`,
      return_url:  `${FRONTEND_URL}/admin/settings?tab=payouts&stripe=success`,
      type:        'account_onboarding',
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error('[stripe-connect/onboard]', err.message);
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
};

// GET /api/business/me/stripe-connect/status
// Returns whether this business has a connected Stripe account and its payout status.
exports.status = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT stripe_account_id FROM businesses WHERE id = $1',
      [req.business.id]
    );
    const accountId = rows[0]?.stripe_account_id;

    if (!accountId) {
      return res.json({ status: 'not_connected', account_id: null });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);

    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending_verification';
    }

    // Persist onboarding_complete flag once active
    if (status === 'active') {
      await db.query(
        'UPDATE businesses SET stripe_onboarding_complete = true WHERE id = $1',
        [req.business.id]
      ).catch(() => {});
    }

    res.json({
      status,
      account_id: accountId,
      charges_enabled:   account.charges_enabled,
      payouts_enabled:   account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error('[stripe-connect/status]', err.message);
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
};

// POST /api/business/me/stripe-connect/dashboard
// Returns a single-use Stripe Express dashboard login link.
exports.dashboard = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT stripe_account_id FROM businesses WHERE id = $1',
      [req.business.id]
    );
    const accountId = rows[0]?.stripe_account_id;
    if (!accountId) {
      return res.status(400).json({ error: 'No Stripe account connected yet' });
    }

    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    res.json({ url: loginLink.url });
  } catch (err) {
    console.error('[stripe-connect/dashboard]', err.message);
    res.status(500).json({ error: err.message });
  }
};
