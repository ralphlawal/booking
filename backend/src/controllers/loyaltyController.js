const db = require('../config/database');
const crypto = require('crypto');

/* ── helpers ─────────────────────────────────────────────────────────────── */

async function getBalance(businessId, customerId, consumerId) {
  const idClause = customerId
    ? `customer_id = $2`
    : `consumer_id = $2`;
  const idVal = customerId || consumerId;
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(points), 0)::int AS balance
     FROM loyalty_ledger
     WHERE business_id = $1 AND ${idClause}
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [businessId, idVal]
  );
  return parseInt(rows[0]?.balance || 0);
}

/* ── Admin: program management ────────────────────────────────────────────── */

exports.getProgram = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM loyalty_programs WHERE business_id = $1',
      [req.business.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertProgram = async (req, res) => {
  try {
    const { name, type, points_per_pound, points_per_visit, points_expiry_days, is_active } = req.body;
    const { rows } = await db.query(
      `INSERT INTO loyalty_programs
         (id, business_id, name, type, points_per_pound, points_per_visit, points_expiry_days, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (business_id) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         points_per_pound = EXCLUDED.points_per_pound,
         points_per_visit = EXCLUDED.points_per_visit,
         points_expiry_days = EXCLUDED.points_expiry_days,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        crypto.randomUUID(), req.business.id,
        name || 'Loyalty Rewards',
        type || 'spend',
        points_per_pound ?? 1,
        points_per_visit ?? 10,
        points_expiry_days ?? 365,
        is_active !== false,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Admin: rewards management ─────────────────────────────────────────────── */

exports.listRewards = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, s.name AS service_name
       FROM loyalty_rewards r
       LEFT JOIN services s ON s.id = r.service_id
       WHERE r.business_id = $1
       ORDER BY r.created_at DESC`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createReward = async (req, res) => {
  try {
    const { name, description, type, points_cost, discount_value, service_id, max_redemptions } = req.body;
    if (!name || !points_cost) return res.status(400).json({ error: 'name and points_cost required' });
    const { rows } = await db.query(
      `INSERT INTO loyalty_rewards
         (id, business_id, name, description, type, points_cost, discount_value, service_id, max_redemptions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        crypto.randomUUID(), req.business.id,
        name, description || null,
        type || 'discount',
        parseInt(points_cost),
        discount_value ? parseFloat(discount_value) : null,
        service_id || null,
        max_redemptions ? parseInt(max_redemptions) : null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateReward = async (req, res) => {
  try {
    const allowed = ['name','description','type','points_cost','discount_value','service_id','max_redemptions','is_active'];
    const sets = [];
    const vals = [req.params.id, req.business.id];
    let i = 3;
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    const { rows } = await db.query(
      `UPDATE loyalty_rewards SET ${sets.join(', ')} WHERE id=$1 AND business_id=$2 RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Reward not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteReward = async (req, res) => {
  try {
    await db.query('DELETE FROM loyalty_rewards WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Admin: customer ledger view ─────────────────────────────────────────── */

exports.customerPoints = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const balance = await getBalance(req.business.id, customer_id, null);
    const { rows: ledger } = await db.query(
      `SELECT l.*, b.reference_id AS booking_ref
       FROM loyalty_ledger l
       LEFT JOIN bookings b ON b.id = l.booking_id
       WHERE l.business_id = $1 AND l.customer_id = $2
       ORDER BY l.created_at DESC LIMIT 50`,
      [req.business.id, customer_id]
    );
    res.json({ balance, ledger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adjustPoints = async (req, res) => {
  try {
    const { customer_id, points, note } = req.body;
    if (!customer_id || !points) return res.status(400).json({ error: 'customer_id and points required' });

    const prog = await db.query('SELECT * FROM loyalty_programs WHERE business_id=$1', [req.business.id]);
    const expiryDays = prog.rows[0]?.points_expiry_days;
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 86400 * 1000)
      : null;

    const { rows } = await db.query(
      `INSERT INTO loyalty_ledger
         (id, business_id, customer_id, type, points, note, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        crypto.randomUUID(), req.business.id, customer_id,
        parseInt(points) > 0 ? 'adjust' : 'adjust',
        parseInt(points), note || 'Manual adjustment', expiresAt,
      ]
    );
    const newBalance = await getBalance(req.business.id, customer_id, null);
    res.json({ entry: rows[0], balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Admin: list redemptions ─────────────────────────────────────────────── */

exports.listRedemptions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT rd.*, r.name AS reward_name, c.full_name AS customer_name
       FROM loyalty_redemptions rd
       JOIN loyalty_rewards r ON r.id = rd.reward_id
       LEFT JOIN customers c ON c.id = rd.customer_id
       WHERE rd.business_id = $1
       ORDER BY rd.created_at DESC LIMIT 100`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Consumer: check balance + redeem ────────────────────────────────────── */

exports.consumerBalance = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    const balance = await getBalance(biz[0].id, null, req.consumer.id);
    const { rows: rewards } = await db.query(
      'SELECT * FROM loyalty_rewards WHERE business_id=$1 AND is_active=TRUE ORDER BY points_cost',
      [biz[0].id]
    );
    res.json({ balance, rewards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.redeemReward = async (req, res) => {
  try {
    const { reward_id, booking_id } = req.body;
    if (!reward_id) return res.status(400).json({ error: 'reward_id required' });

    const { rows: rRows } = await db.query(
      'SELECT * FROM loyalty_rewards WHERE id=$1 AND is_active=TRUE',
      [reward_id]
    );
    const reward = rRows[0];
    if (!reward) return res.status(404).json({ error: 'Reward not found' });

    const balance = await getBalance(reward.business_id, null, req.consumer.id);
    if (balance < reward.points_cost) {
      return res.status(400).json({ error: 'Insufficient points', balance, required: reward.points_cost });
    }
    if (reward.max_redemptions && reward.redeemed_count >= reward.max_redemptions) {
      return res.status(400).json({ error: 'This reward has reached its redemption limit' });
    }

    // Debit points
    await db.query(
      `INSERT INTO loyalty_ledger
         (id, business_id, consumer_id, booking_id, type, points, note)
       VALUES ($1,$2,$3,$4,'redeem',$5,$6)`,
      [
        crypto.randomUUID(), reward.business_id, req.consumer.id,
        booking_id || null, -reward.points_cost,
        `Redeemed: ${reward.name}`,
      ]
    );

    // Record redemption
    const { rows: redRows } = await db.query(
      `INSERT INTO loyalty_redemptions
         (id, reward_id, business_id, consumer_id, booking_id, points_spent)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        crypto.randomUUID(), reward.id, reward.business_id,
        req.consumer.id, booking_id || null, reward.points_cost,
      ]
    );

    await db.query(
      'UPDATE loyalty_rewards SET redeemed_count = redeemed_count + 1 WHERE id=$1',
      [reward.id]
    );

    const newBalance = await getBalance(reward.business_id, null, req.consumer.id);
    res.json({ redemption: redRows[0], balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Internal: award points after booking completion ─────────────────────── */

exports.awardBookingPoints = async (businessId, bookingId, customerId, consumerId, amountPaid) => {
  try {
    const { rows: progRows } = await db.query(
      'SELECT * FROM loyalty_programs WHERE business_id=$1 AND is_active=TRUE',
      [businessId]
    );
    const prog = progRows[0];
    if (!prog) return;

    let points = 0;
    if (prog.type === 'spend' || prog.type === 'hybrid') {
      points += Math.floor((amountPaid || 0) * parseFloat(prog.points_per_pound));
    }
    if (prog.type === 'visits' || prog.type === 'hybrid') {
      points += parseInt(prog.points_per_visit);
    }
    if (points <= 0) return;

    const expiresAt = prog.points_expiry_days
      ? new Date(Date.now() + prog.points_expiry_days * 86400 * 1000)
      : null;

    await db.query(
      `INSERT INTO loyalty_ledger
         (id, business_id, customer_id, consumer_id, booking_id, type, points, note, expires_at)
       VALUES ($1,$2,$3,$4,$5,'earn',$6,'Earned from booking',$7)`,
      [
        crypto.randomUUID(), businessId,
        customerId || null, consumerId || null,
        bookingId, points, expiresAt,
      ]
    );
  } catch (err) {
    console.error('[loyalty/awardBookingPoints]', err.message);
  }
};
