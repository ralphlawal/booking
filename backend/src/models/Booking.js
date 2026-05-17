const db = require('../config/database');
const crypto = require('crypto');

const Booking = {
  async create({ reference_id, business_id, service_id, customer_id, booking_date, start_time, end_time, notes }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO bookings
         (id, reference_id, business_id, service_id, customer_id, booking_date, start_time, end_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, reference_id, business_id, service_id, customer_id, booking_date, start_time, end_time, notes]
    );
    return rows[0];
  },

  async findByBusinessId(business_id, { status, date, page = 1, limit = 200 } = {}) {
    const conditions = ['b.business_id = $1'];
    const values = [business_id];
    let idx = 2;

    if (status) { conditions.push(`b.status = $${idx++}`); values.push(status); }
    if (date) { conditions.push(`b.booking_date = $${idx++}`); values.push(date); }

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const sql = `
      SELECT b.*,
        s.name AS service_name, s.price AS service_price, s.duration_minutes,
        c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN customers c ON c.id = b.customer_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.booking_date DESC, b.start_time DESC
      LIMIT $${idx} OFFSET $${idx + 1}`;

    const { rows } = await db.query(sql, values);
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT b.*,
        s.name AS service_name, s.price AS service_price, s.duration_minutes,
        c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
        bus.name AS business_name, bus.phone AS business_phone, bus.email AS business_email
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN customers c ON c.id = b.customer_id
       JOIN businesses bus ON bus.id = b.business_id
       WHERE b.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByReference(reference_id) {
    const { rows } = await db.query(
      `SELECT b.*,
        s.name AS service_name, s.price AS service_price,
        c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
        bus.name AS business_name, bus.phone AS business_phone, bus.email AS business_email, bus.slug
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN customers c ON c.id = b.customer_id
       JOIN businesses bus ON bus.id = b.business_id
       WHERE b.reference_id = $1`,
      [reference_id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, business_id, status, cancelled_reason) {
    const { rows } = await db.query(
      `UPDATE bookings SET status = $1, cancelled_reason = $2, updated_at = NOW()
       WHERE id = $3 AND business_id = $4 RETURNING *`,
      [status, cancelled_reason || null, id, business_id]
    );
    return rows[0];
  },

  async reschedule(id, business_id, { booking_date, start_time, end_time }) {
    const { rows } = await db.query(
      `UPDATE bookings SET booking_date = $1, start_time = $2, end_time = $3, updated_at = NOW()
       WHERE id = $4 AND business_id = $5 RETURNING *`,
      [booking_date, start_time, end_time, id, business_id]
    );
    return rows[0];
  },

  async checkConflict(business_id, booking_date, start_time, end_time, exclude_id) {
    const params = [business_id, booking_date, start_time, end_time];
    const excludeClause = exclude_id ? `AND id != $5` : '';
    if (exclude_id) params.push(exclude_id);

    const { rows } = await db.query(
      `SELECT id FROM bookings
       WHERE business_id = $1
         AND booking_date = $2
         AND status NOT IN ('cancelled')
         AND start_time < $4
         AND end_time > $3
         ${excludeClause}`,
      params
    );
    return rows.length > 0;
  },

  async getStats(business_id) {
    const { rows } = await db.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN s.price ELSE 0 END), 0) AS revenue
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       WHERE b.business_id = $1`,
      [business_id]
    );
    return rows[0];
  },

  async getAnalytics(business_id) {
    const isPg = !!process.env.DATABASE_URL;

    const dateFilter = isPg
      ? `b.booking_date >= CURRENT_DATE - INTERVAL '30 days'`
      : `b.booking_date >= DATE('now', '-30 days')`;

    const [daily, topServices, statusBreakdown] = await Promise.all([
      db.query(
        `SELECT booking_date AS date,
           COUNT(*) AS bookings,
           COALESCE(SUM(CASE WHEN b.status IN ('completed','confirmed') THEN s.price ELSE 0 END), 0) AS revenue
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE b.business_id = $1 AND ${dateFilter}
         GROUP BY booking_date ORDER BY booking_date ASC`,
        [business_id]
      ).then(r => r.rows),

      db.query(
        `SELECT s.name, COUNT(*) AS count
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE b.business_id = $1
         GROUP BY s.id, s.name ORDER BY count DESC LIMIT 5`,
        [business_id]
      ).then(r => r.rows),

      db.query(
        `SELECT status, COUNT(*) AS count FROM bookings
         WHERE business_id = $1 GROUP BY status`,
        [business_id]
      ).then(r => r.rows),
    ]);

    return { daily, topServices, statusBreakdown };
  },

  async getPendingReminders() {
    const isPg = !!process.env.DATABASE_URL;
    const now = isPg ? `NOW()` : `DATETIME('now')`;
    const h24 = isPg
      ? `booking_date::timestamp + start_time::interval BETWEEN NOW() AND NOW() + INTERVAL '25 hours'`
      : `DATETIME(booking_date || ' ' || start_time) BETWEEN DATETIME('now') AND DATETIME('now', '+25 hours')`;
    const h1 = isPg
      ? `booking_date::timestamp + start_time::interval BETWEEN NOW() AND NOW() + INTERVAL '70 minutes'`
      : `DATETIME(booking_date || ' ' || start_time) BETWEEN DATETIME('now') AND DATETIME('now', '+70 minutes')`;

    const [reminders24h, reminders1h] = await Promise.all([
      db.query(
        `SELECT b.*, c.email AS customer_email, c.full_name AS customer_name,
           s.name AS service_name, bus.name AS business_name, bus.phone AS business_phone
         FROM bookings b
         JOIN customers c ON c.id = b.customer_id
         JOIN services s ON s.id = b.service_id
         JOIN businesses bus ON bus.id = b.business_id
         WHERE b.status IN ('confirmed','pending')
           AND b.reminder_24h_sent = FALSE
           AND c.email IS NOT NULL
           AND ${h24}`,
        []
      ).then(r => r.rows),

      db.query(
        `SELECT b.*, c.email AS customer_email, c.full_name AS customer_name,
           s.name AS service_name, bus.name AS business_name, bus.phone AS business_phone
         FROM bookings b
         JOIN customers c ON c.id = b.customer_id
         JOIN services s ON s.id = b.service_id
         JOIN businesses bus ON bus.id = b.business_id
         WHERE b.status IN ('confirmed','pending')
           AND b.reminder_1h_sent = FALSE
           AND c.email IS NOT NULL
           AND ${h1}`,
        []
      ).then(r => r.rows),
    ]);

    return { reminders24h, reminders1h };
  },

  async markReminderSent(id, type) {
    const col = type === '24h' ? 'reminder_24h_sent' : 'reminder_1h_sent';
    await db.query(`UPDATE bookings SET ${col} = TRUE WHERE id = $1`, [id]);
  },
};

module.exports = Booking;
