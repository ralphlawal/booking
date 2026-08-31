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

/* ── Admin: package definition ───────────────────────────────────────────── */

exports.listPackages = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,
              json_agg(json_build_object('service_id', ps.service_id, 'service_name', s.name))
                FILTER (WHERE ps.service_id IS NOT NULL) AS services
       FROM service_packages p
       LEFT JOIN service_package_services ps ON ps.package_id = p.id
       LEFT JOIN services s ON s.id = ps.service_id
       WHERE p.business_id = $1
       GROUP BY p.id ORDER BY p.sort_order, p.created_at`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { name, description, session_count, price, currency, valid_days, services } = req.body;
    if (!name || !session_count || !price) {
      return res.status(400).json({ error: 'name, session_count, and price required' });
    }
    const pkgId = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO service_packages
         (id, business_id, name, description, session_count, price, currency, valid_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        pkgId, req.business.id, name, description || null,
        parseInt(session_count), parseFloat(price),
        currency || 'gbp', valid_days ?? 365,
      ]
    );
    if (Array.isArray(services) && services.length) {
      for (const sid of services) {
        await db.query(
          'INSERT INTO service_package_services (package_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [pkgId, sid]
        );
      }
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const { name, description, session_count, price, valid_days, is_active, sort_order, services } = req.body;
    const { rows } = await db.query(
      `UPDATE service_packages SET
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         session_count = COALESCE($5, session_count),
         price = COALESCE($6, price),
         valid_days = COALESCE($7, valid_days),
         is_active = COALESCE($8, is_active),
         sort_order = COALESCE($9, sort_order),
         updated_at = NOW()
       WHERE id=$1 AND business_id=$2 RETURNING *`,
      [req.params.id, req.business.id, name, description, session_count, price, valid_days, is_active, sort_order]
    );
    if (!rows.length) return res.status(404).json({ error: 'Package not found' });
    if (Array.isArray(services)) {
      await db.query('DELETE FROM service_package_services WHERE package_id=$1', [req.params.id]);
      for (const sid of services) {
        await db.query(
          'INSERT INTO service_package_services (package_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.params.id, sid]
        );
      }
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    await db.query('DELETE FROM service_packages WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Admin: customer package purchases ────────────────────────────────────── */

exports.listCustomerPackages = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cp.*, p.name AS package_name, p.session_count,
              c.full_name AS customer_name, c.email AS customer_email
       FROM customer_packages cp
       JOIN service_packages p ON p.id = cp.package_id
       LEFT JOIN customers c ON c.id = cp.customer_id
       WHERE cp.business_id = $1
       ORDER BY cp.purchased_at DESC LIMIT 200`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Public: list packages for a business ─────────────────────────────────── */

exports.listPublic = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    const { rows } = await db.query(
      `SELECT p.*,
              json_agg(json_build_object('service_id', ps.service_id, 'service_name', s.name))
                FILTER (WHERE ps.service_id IS NOT NULL) AS services
       FROM service_packages p
       LEFT JOIN service_package_services ps ON ps.package_id = p.id
       LEFT JOIN services s ON s.id = ps.service_id
       WHERE p.business_id = $1 AND p.is_active = TRUE
       GROUP BY p.id ORDER BY p.sort_order, p.price`,
      [biz[0].id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Consumer: purchase a package ─────────────────────────────────────────── */

exports.createPaymentIntent = async (req, res) => {
  try {
    const { package_id, currency } = req.body;
    if (!package_id) return res.status(400).json({ error: 'package_id required' });

    const { rows: pkgRows } = await db.query(
      'SELECT * FROM service_packages WHERE id=$1 AND is_active=TRUE',
      [package_id]
    );
    const pkg = pkgRows[0];
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const { rows: biz } = await db.query(
      'SELECT stripe_account_id, stripe_onboarding_complete FROM businesses WHERE id=$1',
      [pkg.business_id]
    );
    if (!biz[0]?.stripe_account_id || !biz[0]?.stripe_onboarding_complete) {
      return res.status(503).json({
        error: 'This business has not enabled online payments yet.',
        code: 'BUSINESS_STRIPE_NOT_CONNECTED',
      });
    }

    const stripe = getStripe();
    const amountPence = Math.round(parseFloat(pkg.price) * 100);
    const usedCurrency = (currency || pkg.currency || 'gbp').toLowerCase();
    const feePercent = Math.max(0, Math.min(50, parseFloat(process.env.PLATFORM_FEE_PERCENT || '10')));
    const applicationFee = Math.round(amountPence * feePercent / 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: usedCurrency,
      description: `Package: ${pkg.name}`,
      automatic_payment_methods: { enabled: true },
      on_behalf_of: biz[0].stripe_account_id,
      transfer_data: { destination: biz[0].stripe_account_id },
      application_fee_amount: applicationFee,
      metadata: {
        package_id, consumer_id: req.consumer.id, business_id: pkg.business_id,
      },
    });

    // Pre-create the customer_packages record as pending
    const cpId = crypto.randomUUID();
    const expiresAt = pkg.valid_days
      ? new Date(Date.now() + pkg.valid_days * 86400 * 1000)
      : null;
    await db.query(
      `INSERT INTO customer_packages
         (id, package_id, business_id, consumer_id, sessions_total, price_paid, currency,
          stripe_payment_intent_id, payment_status, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','pending',$9)`,
      [cpId, package_id, pkg.business_id, req.consumer.id, parseInt(pkg.session_count),
       parseFloat(pkg.price), usedCurrency, intent.id, expiresAt]
    );

    res.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      customer_package_id: cpId,
      amount_pence: amountPence,
    });
  } catch (err) {
    console.error('[package/createPaymentIntent]', err.message);
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
      await db.query(
        `UPDATE customer_packages SET payment_status='paid', status='active'
         WHERE stripe_payment_intent_id=$1`,
        [payment_intent_id]
      );
    }

    const { rows } = await db.query(
      'SELECT * FROM customer_packages WHERE stripe_payment_intent_id=$1',
      [payment_intent_id]
    );
    res.json(rows[0] || { message: 'Confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Consumer: my packages ─────────────────────────────────────────────────── */

exports.myPackages = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [slug]);
    if (!biz.length) return res.json([]);
    const { rows } = await db.query(
      `SELECT cp.*, p.name AS package_name, p.session_count AS total_sessions
       FROM customer_packages cp
       JOIN service_packages p ON p.id = cp.package_id
       WHERE cp.business_id=$1 AND cp.consumer_id=$2 AND cp.status='active'
         AND cp.sessions_remaining > 0
         AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
       ORDER BY cp.purchased_at DESC`,
      [biz[0].id, req.consumer.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Internal: validate and redeem one session ────────────────────────────── */

exports.redeemSession = async (customerPackageId, bookingId) => {
  try {
    const { rows } = await db.query(
      `UPDATE customer_packages
       SET sessions_used = sessions_used + 1,
           status = CASE WHEN sessions_used + 1 >= sessions_total THEN 'exhausted' ELSE status END
       WHERE id=$1 AND status='active' AND sessions_remaining > 0
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING *`,
      [customerPackageId]
    );
    if (!rows.length) return false;
    await db.query(
      'INSERT INTO package_redemptions (id, customer_package_id, booking_id) VALUES ($1,$2,$3)',
      [crypto.randomUUID(), customerPackageId, bookingId]
    );
    return true;
  } catch (err) {
    console.error('[package/redeemSession]', err.message);
    return false;
  }
};

/* ── Validate a package before booking (returns eligibility) ─────────────── */

exports.validatePackage = async (req, res) => {
  try {
    const { customer_package_id, service_id } = req.query;
    if (!customer_package_id) return res.status(400).json({ error: 'customer_package_id required' });

    const { rows } = await db.query(
      `SELECT cp.*, p.name AS package_name,
              (SELECT COUNT(*) FROM service_package_services sps
               WHERE sps.package_id=p.id AND sps.service_id=$2) AS service_allowed
       FROM customer_packages cp
       JOIN service_packages p ON p.id=cp.package_id
       WHERE cp.id=$1 AND cp.consumer_id=$3 AND cp.status='active'
         AND cp.sessions_remaining > 0
         AND (cp.expires_at IS NULL OR cp.expires_at > NOW())`,
      [customer_package_id, service_id || null, req.consumer.id]
    );
    const pkg = rows[0];
    if (!pkg) return res.json({ valid: false, reason: 'Package not found or has no remaining sessions' });

    // If package has service restrictions and this service isn't in them
    const { rows: svcRows } = await db.query(
      'SELECT COUNT(*) FROM service_package_services WHERE package_id=$1',
      [pkg.package_id]
    );
    const hasRestrictions = parseInt(svcRows[0].count) > 0;
    if (hasRestrictions && service_id && parseInt(pkg.service_allowed) === 0) {
      return res.json({ valid: false, reason: 'This package cannot be used for this service' });
    }

    res.json({ valid: true, sessions_remaining: pkg.sessions_remaining, package_name: pkg.package_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
