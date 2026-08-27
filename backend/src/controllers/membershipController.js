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

/* ── Admin: plan management ──────────────────────────────────────────────── */

exports.listPlans = async (req, res) => {
  try {
    const { rows: plans } = await db.query(
      `SELECT p.*,
              json_agg(json_build_object(
                'id', ps.id, 'service_id', ps.service_id,
                'quantity', ps.quantity, 'service_name', s.name
              ) ORDER BY s.name) FILTER (WHERE ps.id IS NOT NULL) AS services
       FROM membership_plans p
       LEFT JOIN membership_plan_services ps ON ps.plan_id = p.id
       LEFT JOIN services s ON s.id = ps.service_id
       WHERE p.business_id = $1
       GROUP BY p.id
       ORDER BY p.sort_order, p.created_at`,
      [req.business.id]
    );
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, description, price, currency, interval, interval_count, priority_booking, services } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price required' });

    const planId = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO membership_plans
         (id, business_id, name, description, price, currency, interval, interval_count, priority_booking)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        planId, req.business.id, name, description || null,
        parseFloat(price), currency || 'gbp',
        interval || 'month', interval_count || 1,
        priority_booking || false,
      ]
    );
    const plan = rows[0];

    // Insert included services
    if (Array.isArray(services) && services.length) {
      for (const svc of services) {
        await db.query(
          `INSERT INTO membership_plan_services (id, plan_id, service_id, quantity)
           VALUES ($1,$2,$3,$4) ON CONFLICT (plan_id, service_id) DO NOTHING`,
          [crypto.randomUUID(), planId, svc.service_id, svc.quantity || 1]
        );
      }
    }

    // Create Stripe product + price if Stripe is configured
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripe();
        const product = await stripe.products.create({
          name: `${req.business.name || 'Membership'}: ${name}`,
          description: description || undefined,
          metadata: { plan_id: planId, business_id: req.business.id },
        });
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(parseFloat(price) * 100),
          currency: (currency || 'gbp').toLowerCase(),
          recurring: { interval: interval || 'month', interval_count: interval_count || 1 },
          metadata: { plan_id: planId },
        });
        await db.query(
          'UPDATE membership_plans SET stripe_product_id=$1, stripe_price_id=$2 WHERE id=$3',
          [product.id, stripePrice.id, planId]
        );
        plan.stripe_product_id = product.id;
        plan.stripe_price_id = stripePrice.id;
      } catch (stripeErr) {
        console.error('[membership/createPlan] Stripe product creation failed:', stripeErr.message);
      }
    }

    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { name, description, priority_booking, is_active, sort_order, services } = req.body;
    const { rows } = await db.query(
      `UPDATE membership_plans SET
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         priority_booking = COALESCE($5, priority_booking),
         is_active = COALESCE($6, is_active),
         sort_order = COALESCE($7, sort_order),
         updated_at = NOW()
       WHERE id=$1 AND business_id=$2 RETURNING *`,
      [req.params.id, req.business.id, name, description, priority_booking, is_active, sort_order]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found' });

    if (Array.isArray(services)) {
      await db.query('DELETE FROM membership_plan_services WHERE plan_id=$1', [req.params.id]);
      for (const svc of services) {
        await db.query(
          `INSERT INTO membership_plan_services (id, plan_id, service_id, quantity)
           VALUES ($1,$2,$3,$4) ON CONFLICT (plan_id, service_id) DO NOTHING`,
          [crypto.randomUUID(), req.params.id, svc.service_id, svc.quantity || 1]
        );
      }
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM customer_memberships WHERE plan_id=$1 AND status=\'active\'',
      [req.params.id]
    );
    if (parseInt(rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete a plan with active subscribers. Deactivate it instead.' });
    }
    await db.query('DELETE FROM membership_plans WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Admin: subscriber view ──────────────────────────────────────────────── */

exports.listSubscribers = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cm.*, p.name AS plan_name, p.price, p.currency, p.interval,
              c.name AS customer_name, c.email AS customer_email,
              (
                SELECT COUNT(*) FROM membership_usage mu WHERE mu.membership_id = cm.id
                  AND mu.period_start = cm.current_period_start
              ) AS usage_this_period
       FROM customer_memberships cm
       JOIN membership_plans p ON p.id = cm.plan_id
       LEFT JOIN customers c ON c.id = cm.customer_id
       WHERE cm.business_id = $1
       ORDER BY cm.created_at DESC`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM customer_memberships WHERE id=$1 AND business_id=$2',
      [req.params.id, req.business.id]
    );
    const sub = rows[0];
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (sub.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    }

    await db.query(
      'UPDATE customer_memberships SET cancel_at_period_end=TRUE, updated_at=NOW() WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Subscription will cancel at end of current period' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Public: plans list for booking page ─────────────────────────────────── */

exports.listPublicPlans = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });

    const { rows } = await db.query(
      `SELECT p.*,
              json_agg(json_build_object(
                'service_id', ps.service_id, 'quantity', ps.quantity, 'service_name', s.name
              ) ORDER BY s.name) FILTER (WHERE ps.id IS NOT NULL) AS services
       FROM membership_plans p
       LEFT JOIN membership_plan_services ps ON ps.plan_id = p.id
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

/* ── Consumer: subscribe / check membership ──────────────────────────────── */

exports.subscribe = async (req, res) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

    const { rows: planRows } = await db.query(
      'SELECT * FROM membership_plans WHERE id=$1 AND is_active=TRUE',
      [plan_id]
    );
    const plan = planRows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Check if already subscribed
    const { rows: existing } = await db.query(
      `SELECT id FROM customer_memberships
       WHERE plan_id=$1 AND consumer_id=$2 AND status='active'`,
      [plan_id, req.consumer.id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Already subscribed to this plan' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        error: 'Online memberships are not enabled yet. Please contact the business to subscribe.',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    }
    if (!plan.stripe_price_id) {
      return res.status(503).json({
        error: 'This membership plan is not yet set up for online subscriptions.',
        code: 'PLAN_STRIPE_NOT_CONFIGURED',
      });
    }

    const stripe = getStripe();

    // Get or create Stripe customer for this consumer
    let stripeCustomerId = req.consumer.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.consumer.email,
        name: req.consumer.full_name,
        metadata: { consumer_id: req.consumer.id },
      });
      stripeCustomerId = customer.id;
      await db.query(
        'UPDATE consumer_accounts SET stripe_customer_id=$1 WHERE id=$2',
        [stripeCustomerId, req.consumer.id]
      );
    }

    // Create Stripe subscription (returns client_secret for payment confirmation)
    const biz = await db.query(
      'SELECT stripe_account_id FROM businesses WHERE id=$1',
      [plan.business_id]
    );
    const bizStripeId = biz.rows[0]?.stripe_account_id;

    const subParams = {
      customer: stripeCustomerId,
      items: [{ price: plan.stripe_price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { plan_id, consumer_id: req.consumer.id, business_id: plan.business_id },
    };
    if (bizStripeId) {
      subParams.on_behalf_of = bizStripeId;
      subParams.transfer_data = { destination: bizStripeId };
    }

    const subscription = await stripe.subscriptions.create(subParams);

    const membershipId = crypto.randomUUID();
    await db.query(
      `INSERT INTO customer_memberships
         (id, plan_id, business_id, consumer_id, status, stripe_subscription_id, stripe_customer_id,
          current_period_start, current_period_end)
       VALUES ($1,$2,$3,$4,'pending',$5,$6, to_timestamp($7), to_timestamp($8))`,
      [
        membershipId, plan_id, plan.business_id, req.consumer.id,
        subscription.id, stripeCustomerId,
        subscription.current_period_start,
        subscription.current_period_end,
      ]
    );

    res.status(201).json({
      membership_id: membershipId,
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: subscription.status,
    });
  } catch (err) {
    console.error('[membership/subscribe]', err.message);
    const status = err.code === 'STRIPE_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
};

exports.consumerMemberships = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [slug]);
    if (!biz.length) return res.json([]);
    const { rows } = await db.query(
      `SELECT cm.*, p.name AS plan_name, p.price, p.currency, p.interval,
              (SELECT json_agg(json_build_object('service_name', s.name, 'quantity', ps.quantity,
                'used', (SELECT COUNT(*) FROM membership_usage mu WHERE mu.membership_id=cm.id
                           AND mu.plan_service_id=ps.id AND mu.period_start=cm.current_period_start)))
               FROM membership_plan_services ps JOIN services s ON s.id=ps.service_id
               WHERE ps.plan_id=p.id) AS services
       FROM customer_memberships cm
       JOIN membership_plans p ON p.id=cm.plan_id
       WHERE cm.business_id=$1 AND cm.consumer_id=$2 AND cm.status IN ('active','pending')`,
      [biz[0].id, req.consumer.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Internal: check if booking is covered by an active membership ────────── */

exports.checkMembershipCoverage = async (businessId, consumerId, serviceId) => {
  try {
    const { rows } = await db.query(
      `SELECT cm.id AS membership_id, ps.id AS plan_service_id, ps.quantity,
              (SELECT COUNT(*) FROM membership_usage mu
               WHERE mu.membership_id=cm.id AND mu.plan_service_id=ps.id
                 AND mu.period_start=cm.current_period_start) AS used
       FROM customer_memberships cm
       JOIN membership_plan_services ps ON ps.plan_id=cm.plan_id AND ps.service_id=$3
       WHERE cm.business_id=$1 AND cm.consumer_id=$2 AND cm.status='active'
         AND cm.current_period_end > NOW()`,
      [businessId, consumerId, serviceId]
    );
    for (const row of rows) {
      const remaining = parseInt(row.quantity) === 0 || parseInt(row.used) < parseInt(row.quantity);
      if (remaining) return { covered: true, membership_id: row.membership_id, plan_service_id: row.plan_service_id };
    }
    return { covered: false };
  } catch { return { covered: false }; }
};

exports.recordMembershipUsage = async (membershipId, planServiceId, bookingId, periodStart) => {
  try {
    await db.query(
      `INSERT INTO membership_usage (id, membership_id, plan_service_id, booking_id, period_start)
       VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), membershipId, planServiceId, bookingId, periodStart]
    );
  } catch (err) {
    console.error('[membership/recordUsage]', err.message);
  }
};
