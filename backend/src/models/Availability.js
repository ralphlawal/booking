const db = require('../config/database');
const crypto = require('crypto');

// SQLite stores working_days as JSON text; parse before returning
const parseAv = (row) => row
  ? { ...row, working_days: typeof row.working_days === 'string' ? JSON.parse(row.working_days) : row.working_days }
  : null;

const Availability = {
  async upsert({ business_id, working_days, opening_time, closing_time, slot_interval_minutes, buffer_minutes }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO availability_settings
         (id, business_id, working_days, opening_time, closing_time, slot_interval_minutes, buffer_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (business_id) DO UPDATE SET
         working_days = excluded.working_days,
         opening_time = excluded.opening_time,
         closing_time = excluded.closing_time,
         slot_interval_minutes = excluded.slot_interval_minutes,
         buffer_minutes = excluded.buffer_minutes,
         updated_at = NOW()
       RETURNING *`,
      [id, business_id, JSON.stringify(working_days), opening_time, closing_time, slot_interval_minutes || 30, buffer_minutes || 0]
    );
    return parseAv(rows[0]);
  },

  async findByBusinessId(business_id) {
    const { rows } = await db.query(
      'SELECT * FROM availability_settings WHERE business_id = $1',
      [business_id]
    );
    return parseAv(rows[0]);
  },
};

const BlockedSlot = {
  async create({ business_id, blocked_date, start_time, end_time, reason, is_full_day }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO blocked_slots (id, business_id, blocked_date, start_time, end_time, reason, is_full_day)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, business_id, blocked_date, start_time, end_time, reason, is_full_day ? true : false]
    );
    return rows[0];
  },

  async findByBusinessAndDate(business_id, date) {
    const { rows } = await db.query(
      'SELECT * FROM blocked_slots WHERE business_id = $1 AND blocked_date = $2',
      [business_id, date]
    );
    return rows;
  },

  async findByBusinessId(business_id) {
    const { rows } = await db.query(
      'SELECT * FROM blocked_slots WHERE business_id = $1 ORDER BY blocked_date',
      [business_id]
    );
    return rows;
  },

  async delete(id, business_id) {
    const { rows } = await db.query(
      'DELETE FROM blocked_slots WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, business_id]
    );
    return rows[0];
  },
};

module.exports = { Availability, BlockedSlot };
