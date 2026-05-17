const db = require('../config/database');
const crypto = require('crypto');

const Service = {
  async create({ business_id, name, description, price, duration_minutes }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO services (id, business_id, name, description, price, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, business_id, name, description, price || 0, duration_minutes]
    );
    return rows[0];
  },

  async findByBusinessId(business_id, activeOnly = false) {
    const sql = activeOnly
      ? 'SELECT * FROM services WHERE business_id = $1 AND is_active = TRUE ORDER BY created_at'
      : 'SELECT * FROM services WHERE business_id = $1 ORDER BY created_at';
    const { rows } = await db.query(sql, [business_id]);
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async update(id, business_id, fields) {
    const allowed = ['name','description','price','duration_minutes','is_active'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        // Convert boolean is_active to 1/0 for SQLite
        const val = fields[key];
        updates.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
    if (!updates.length) return null;
    updates.push(`updated_at = NOW()`);
    values.push(id, business_id);
    const { rows } = await db.query(
      `UPDATE services SET ${updates.join(', ')} WHERE id = $${idx} AND business_id = $${idx + 1} RETURNING *`,
      values
    );
    return rows[0];
  },

  async delete(id, business_id) {
    const { rows } = await db.query(
      'DELETE FROM services WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, business_id]
    );
    return rows[0];
  },
};

module.exports = Service;
