const db = require('../config/database');
const crypto = require('crypto');

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM staff_members WHERE business_id = $1 ORDER BY created_at ASC`,
      [req.business.id]
    );
    res.json(rows);
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
    res.json(rows);
  } catch (err) {
    console.error('[staff/public]', err.message);
    res.status(500).json({ error: 'Failed to load staff' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO staff_members (id, business_id, name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, req.business.id, name.trim(), role||null, bio||null, avatar_url||null, phone||null, email||null,
       working_days||[], opening_time||'09:00', closing_time||'18:00']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[staff/create]', err.message);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, role, bio, avatar_url, phone, email, working_days, opening_time, closing_time, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE staff_members
       SET name = COALESCE($1,name), role=$2, bio=$3, avatar_url=$4, phone=$5, email=$6,
           working_days=COALESCE($7,working_days), opening_time=COALESCE($8,opening_time),
           closing_time=COALESCE($9,closing_time), is_active=COALESCE($10,is_active)
       WHERE id=$11 AND business_id=$12 RETURNING *`,
      [name||null, role||null, bio||null, avatar_url||null, phone||null, email||null,
       working_days||null, opening_time||null, closing_time||null, is_active??null,
       req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Staff member not found' });
    res.json(rows[0]);
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
