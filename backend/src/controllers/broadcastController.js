const db = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function isAdmin(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return false;
  try {
    const p = jwt.verify(h.split(' ')[1], JWT_SECRET);
    return p.type === 'admin';
  } catch { return false; }
}

exports.create = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { title, message, type = 'info', expires_at, send_to_users = true } = req.body;
  if (!title?.trim() || !message?.trim()) return res.status(400).json({ error: 'title and message are required' });
  const id = crypto.randomUUID();
  try {
    const { rows } = await db.query(
      `INSERT INTO broadcast_notifications (id, title, message, type, expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, title.trim(), message.trim(), type, expires_at || null]
    );
    let recipients = 0;
    if (send_to_users) {
      recipients = await Notification.createForAllConsumers({
        type: 'broadcast',
        title: title.trim(),
        body: message.trim(),
        link: '/customer/dashboard',
      });
    }
    res.status(201).json({ ...rows[0], recipients });
  } catch (err) {
    console.error('[broadcast/create]', err.message);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
};

exports.list = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(`SELECT * FROM broadcast_notifications ORDER BY created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list broadcasts' });
  }
};

exports.deactivate = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(
      `UPDATE broadcast_notifications SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate' });
  }
};

// Public endpoint — no auth required
exports.getActive = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, message, type, created_at FROM broadcast_notifications
       WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
};
