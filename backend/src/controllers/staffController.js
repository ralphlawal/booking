const db = require('../config/database');
const crypto = require('crypto');

function parseJson(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeStaff(row) {
  if (!row) return row;
  return {
    ...row,
    working_days: parseJson(row.working_days, []),
    is_active: row.is_active === undefined ? row.is_active : !!row.is_active,
  };
}

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM staff_members WHERE business_id = $1 ORDER BY created_at ASC`,
      [req.business.id]
    );
    res.json(rows.map(normalizeStaff));
  } catch (err) {
    console.error('[staff/list]', err.message);
    res.status(500).json({ error: 'Failed to load staff' });
  }
};

exports.listPublic = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    const { rows } = await db.query(
      `SELECT id, name, role, bio, avatar_url, working_days, opening_time, closing_time
       FROM staff_members WHERE business_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
      [biz[0].id]
    );
    res.json(rows.map(normalizeStaff));
  } catch (err) {
    console.error('[staff/public]', err.message);
    res.status(500).json({ error: 'Failed to load staff' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time, commission_type, commission_value } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO staff_members (id, business_id, name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time, commission_type, commission_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, req.business.id, name.trim(), role||null, bio||null, avatar_url||null, phone||null, email||null,
       working_days||[], opening_time||'09:00', closing_time||'18:00',
       commission_type||'none', parseFloat(commission_value)||0]
    );
    res.status(201).json(normalizeStaff(rows[0]));
  } catch (err) {
    console.error('[staff/create]', err.message);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time, is_active, commission_type, commission_value } = req.body;
    const { rows } = await db.query(
      `UPDATE staff_members
       SET name = COALESCE($1,name), role=$2, bio=$3, avatar_url=$4, phone=$5, email=$6,
           working_days=COALESCE($7,working_days), opening_time=COALESCE($8,opening_time),
           closing_time=COALESCE($9,closing_time), is_active=COALESCE($10,is_active),
           commission_type=COALESCE($13,commission_type), commission_value=COALESCE($14,commission_value)
       WHERE id=$11 AND business_id=$12 RETURNING *`,
      [name||null, role||null, bio||null, avatar_url||null, phone||null, email||null,
       working_days||null, opening_time||null, closing_time||null, is_active??null,
       req.params.id, req.business.id,
       commission_type||null, commission_value != null ? parseFloat(commission_value) : null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Staff member not found' });
    res.json(normalizeStaff(rows[0]));
  } catch (err) {
    console.error('[staff/update]', err.message);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM staff_members WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    console.error('[staff/delete]', err.message);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
};

// GET /api/staff/report?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.report = async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [req.business.id];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND b.booking_date >= $${params.length}`; }
    if (to)   { params.push(to);   dateFilter += ` AND b.booking_date <= $${params.length}`; }

    const { rows } = await db.query(
      `SELECT
         sm.id,
         sm.name,
         sm.role,
         sm.commission_type,
         sm.commission_value,
         COUNT(b.id)                                                        AS total_bookings,
         COUNT(b.id) FILTER (WHERE b.status = 'completed')                 AS completed_bookings,
         COUNT(b.id) FILTER (WHERE b.status = 'cancelled')                 AS cancelled_bookings,
         COALESCE(SUM(s.price) FILTER (WHERE b.status = 'completed'), 0)   AS revenue
       FROM staff_members sm
       LEFT JOIN bookings b ON b.staff_member_id = sm.id ${dateFilter.replace(/\$(\d+)/g, (_, n) => `$${n}`)}
       LEFT JOIN services s ON s.id = b.service_id
       WHERE sm.business_id = $1 AND sm.is_active = TRUE
       GROUP BY sm.id
       ORDER BY revenue DESC, sm.name`,
      params
    );

    const result = rows.map(r => {
      const revenue = parseFloat(r.revenue) || 0;
      let commission = 0;
      if (r.commission_type === 'percent') {
        commission = Math.round(revenue * parseFloat(r.commission_value) / 100 * 100) / 100;
      } else if (r.commission_type === 'flat') {
        commission = parseFloat(r.commission_value) * parseInt(r.completed_bookings);
      }
      return { ...r, revenue, commission };
    });

    res.json(result);
  } catch (err) {
    console.error('[staff/report]', err.message);
    res.status(500).json({ error: 'Failed to generate staff report' });
  }
};
