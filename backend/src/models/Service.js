const db = require('../config/database');
const crypto = require('crypto');

function parseJson(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

const WRITABLE = [
  'name', 'description', 'price', 'duration_minutes', 'is_active',
  'deposit_required', 'deposit_amount', 'category', 'max_group_size',
  'buffer_time', 'sort_order', 'online_booking_enabled',
  'cancellation_policy', 'location', 'addons',
];

const Service = {
  async create({ business_id, name, description, price, duration_minutes,
                 deposit_required, deposit_amount, category, max_group_size,
                 buffer_time, sort_order, online_booking_enabled,
                 cancellation_policy, location, addons, resource_ids }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO services
         (id, business_id, name, description, price, duration_minutes,
          deposit_required, deposit_amount, category, max_group_size,
          buffer_time, sort_order, online_booking_enabled,
          cancellation_policy, location, addons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [id, business_id, name, description, price || 0, duration_minutes,
       deposit_required || false, deposit_amount || 0, category || null, max_group_size || 1,
       buffer_time || 0, sort_order || 0, online_booking_enabled !== false,
       cancellation_policy || null, location || null,
       JSON.stringify(parseJson(addons, []))]
    );
    const svc = rows[0];
    if (resource_ids?.length) {
      await this._syncResources(svc.id, resource_ids);
    }
    return this._attach(svc);
  },

  async findByBusinessId(business_id, activeOnly = false) {
    const where = activeOnly
      ? 'WHERE s.business_id = $1 AND s.is_active = TRUE'
      : 'WHERE s.business_id = $1';
    const { rows } = await db.query(
      `SELECT s.*,
         COALESCE(
           (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'type', r.type))
            FROM service_resources sr
            JOIN resources r ON r.id = sr.resource_id
            WHERE sr.service_id = s.id),
           '[]'::json
         ) AS resources
       FROM services s
       ${where}
       ORDER BY s.sort_order ASC, s.created_at ASC`,
      [business_id]
    );
    return rows.map(this._normalize);
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT s.*,
         COALESCE(
           (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'type', r.type))
            FROM service_resources sr
            JOIN resources r ON r.id = sr.resource_id
            WHERE sr.service_id = s.id),
           '[]'::json
         ) AS resources
       FROM services s WHERE s.id = $1`,
      [id]
    );
    return rows[0] ? this._normalize(rows[0]) : null;
  },

  async update(id, business_id, fields) {
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of WRITABLE) {
      if (fields[key] !== undefined) {
        let val = fields[key];
        if (key === 'addons') val = JSON.stringify(parseJson(val, []));
        updates.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
    if (!updates.length && !fields.resource_ids) return null;

    if (updates.length) {
      updates.push(`updated_at = NOW()`);
      values.push(id, business_id);
      const { rows } = await db.query(
        `UPDATE services SET ${updates.join(', ')}
         WHERE id = $${idx} AND business_id = $${idx + 1} RETURNING *`,
        values
      );
      if (!rows[0]) return null;
    }

    if (fields.resource_ids !== undefined) {
      await this._syncResources(id, fields.resource_ids);
    }
    return this.findById(id);
  },

  async delete(id, business_id) {
    const { rows } = await db.query(
      'DELETE FROM services WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, business_id]
    );
    return rows[0];
  },

  async reorder(business_id, orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.query(
        'UPDATE services SET sort_order = $1 WHERE id = $2 AND business_id = $3',
        [i, orderedIds[i], business_id]
      ).catch(() => {});
    }
  },

  /* helpers */

  async _syncResources(service_id, resource_ids) {
    await db.query('DELETE FROM service_resources WHERE service_id = $1', [service_id]).catch(() => {});
    for (const rid of (resource_ids || [])) {
      await db.query(
        `INSERT INTO service_resources (id, service_id, resource_id)
         VALUES ($1,$2,$3) ON CONFLICT (service_id, resource_id) DO NOTHING`,
        [crypto.randomUUID(), service_id, rid]
      ).catch(() => {});
    }
  },

  _normalize(row) {
    if (!row) return row;
    return {
      ...row,
      resources:  Array.isArray(row.resources) ? row.resources : (typeof row.resources === 'string' ? JSON.parse(row.resources) : []) ,
      addons:     typeof row.addons === 'string' ? JSON.parse(row.addons || '[]') : (row.addons || []),
    };
  },

  _attach(row) { return this._normalize(row); },
};

module.exports = Service;
