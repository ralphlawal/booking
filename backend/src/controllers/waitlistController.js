const db = require('../config/database');
const crypto = require('crypto');

// POST /api/waitlist/:slug  — consumer joins waitlist (public)
exports.join = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1 AND is_active=TRUE', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    const business_id = biz[0].id;
    const { service_id, consumer_name, consumer_email, consumer_phone, requested_date, preferred_time, consumer_id } = req.body;
    if (!consumer_name?.trim() || !consumer_email?.trim()) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO waitlist (id, business_id, service_id, consumer_id, consumer_name, consumer_email, consumer_phone, requested_date, preferred_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, business_id, service_id||null, consumer_id||null, consumer_name.trim(), consumer_email.trim(), consumer_phone||null, requested_date||null, preferred_time||null]
    );
    res.status(201).json({ message: 'Added to waitlist', entry: rows[0] });
  } catch (err) {
    console.error('[waitlist/join]', err.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
};

// GET /api/waitlist  — business sees their waitlist
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT w.*, s.name AS service_name
       FROM waitlist w
       LEFT JOIN services s ON s.id = w.service_id
       WHERE w.business_id=$1 ORDER BY w.created_at DESC`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[waitlist/list]', err.message);
    res.status(500).json({ error: 'Failed to load waitlist' });
  }
};

// PATCH /api/waitlist/:id  — business updates status (notified, cancelled)
exports.update = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['waiting','notified','cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rows } = await db.query(
      'UPDATE waitlist SET status=$1 WHERE id=$2 AND business_id=$3 RETURNING *',
      [status, req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Entry not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update waitlist entry' });
  }
};

// DELETE /api/waitlist/:id
exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM waitlist WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove entry' });
  }
};
