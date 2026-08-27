const db = require('../config/database');
const crypto = require('crypto');

const normalize = (row) => row ? { ...row, quantity: parseInt(row.quantity) || 1 } : row;

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*,
         COALESCE(
           (SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
            FROM service_resources sr JOIN services s ON s.id = sr.service_id
            WHERE sr.resource_id = r.id),
           '[]'::json
         ) AS services
       FROM resources r
       WHERE r.business_id = $1
       ORDER BY r.sort_order ASC, r.created_at ASC`,
      [req.business.id]
    );
    res.json(rows.map(normalize));
  } catch (err) {
    console.error('[resources/list]', err.message);
    res.status(500).json({ error: 'Failed to load resources' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type, description, quantity, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO resources (id, business_id, name, type, description, quantity, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.business.id, name.trim(), type || 'room', description || null,
       parseInt(quantity) || 1, parseInt(sort_order) || 0]
    );
    res.status(201).json(normalize(rows[0]));
  } catch (err) {
    console.error('[resources/create]', err.message);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, type, description, quantity, is_active, sort_order } = req.body;
    const { rows } = await db.query(
      `UPDATE resources
       SET name        = COALESCE($1, name),
           type        = COALESCE($2, type),
           description = $3,
           quantity    = COALESCE($4, quantity),
           is_active   = COALESCE($5, is_active),
           sort_order  = COALESCE($6, sort_order)
       WHERE id = $7 AND business_id = $8 RETURNING *`,
      [name || null, type || null, description ?? null,
       quantity != null ? parseInt(quantity) : null,
       is_active ?? null,
       sort_order != null ? parseInt(sort_order) : null,
       req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Resource not found' });
    res.json(normalize(rows[0]));
  } catch (err) {
    console.error('[resources/update]', err.message);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM resources WHERE id=$1 AND business_id=$2 RETURNING id',
      [req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Resource not found' });
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    console.error('[resources/remove]', err.message);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};
