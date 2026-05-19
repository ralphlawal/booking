const db = require('../config/database');
const crypto = require('crypto');

const Customer = {
  async findOrCreate({ business_id, full_name, phone, email }) {
    if (phone) {
      const { rows } = await db.query(
        'SELECT * FROM customers WHERE business_id = $1 AND phone = $2',
        [business_id, phone]
      );
      if (rows.length) return rows[0];
    }

    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO customers (id, business_id, full_name, phone, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, business_id, full_name, phone, email]
    );
    return rows[0];
  },

  async findByBusinessId(business_id) {
    const { rows } = await db.query(
      `SELECT c.*,
        COUNT(CASE WHEN b.status != 'cancelled' THEN 1 END) AS active_bookings
       FROM customers c
       LEFT JOIN bookings b ON b.customer_id = c.id
       WHERE c.business_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [business_id]
    );
    return rows;
  },

  async incrementBookings(customer_id) {
    await db.query(
      'UPDATE customers SET total_bookings = total_bookings + 1 WHERE id = $1',
      [customer_id]
    );
  },

  async incrementNoShows(customer_id) {
    await db.query(
      'UPDATE customers SET no_shows = no_shows + 1 WHERE id = $1',
      [customer_id]
    );
  },

  async findBookings(customer_id, business_id) {
    const { rows } = await db.query(
      `SELECT b.id, b.reference_id, b.booking_date, b.start_time, b.end_time,
              b.status, b.notes, b.cancelled_reason, b.created_at,
              s.name AS service_name, s.price AS service_price, s.duration_minutes
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       WHERE b.customer_id = $1 AND b.business_id = $2
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [customer_id, business_id]
    );
    return rows;
  },
};

module.exports = Customer;
