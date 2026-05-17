const db = require('../config/database');
const crypto = require('crypto');

const Business = {
  async create({ user_id, name, slug, description, phone, email, location, category, timezone }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO businesses (id, user_id, name, slug, description, phone, email, location, category, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, user_id, name, slug.toLowerCase(), description, phone, email, location, category, timezone || 'UTC']
    );
    return rows[0];
  },

  async findByUserId(user_id) {
    const { rows } = await db.query(
      'SELECT * FROM businesses WHERE user_id = $1',
      [user_id]
    );
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const { rows } = await db.query(
      'SELECT * FROM businesses WHERE slug = $1 AND is_active = 1',
      [slug.toLowerCase()]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['name','description','phone','email','location','category','logo_url','timezone','settings','is_active'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }
    if (!updates.length) return null;
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await db.query(
      `UPDATE businesses SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0];
  },

  async slugExists(slug) {
    const { rows } = await db.query('SELECT id FROM businesses WHERE slug = $1', [slug.toLowerCase()]);
    return rows.length > 0;
  },
};

module.exports = Business;
