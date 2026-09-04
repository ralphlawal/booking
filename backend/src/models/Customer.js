const db = require('../config/database');
const crypto = require('crypto');

const Customer = {
  async findOrCreate({ business_id, full_name, phone, email }) {
    if (phone) {
      const { rows } = await db.query(
        'SELECT * FROM customers WHERE business_id = $1 AND phone = $2',
        [business_id, phone]
      );
      if (rows.length) {
        // A returning customer may have typed a new name/email for this
        // booking (changed email, corrected a typo) — keep the record
        // current rather than silently booking them under stale contact
        // info, which sends confirmations to the wrong address.
        const existing = rows[0];
        const nextName = full_name || existing.full_name;
        const nextEmail = email || existing.email;
        if (nextName !== existing.full_name || nextEmail !== existing.email) {
          const { rows: updated } = await db.query(
            'UPDATE customers SET full_name = $1, email = $2 WHERE id = $3 RETURNING *',
            [nextName, nextEmail, existing.id]
          );
          return updated[0];
        }
        return existing;
      }
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
        COALESCE(SUM(CASE WHEN b.status IN ('completed','confirmed') THEN COALESCE(s.price,0) ELSE 0 END),0)::numeric(10,2) AS lifetime_spend,
        COUNT(CASE WHEN b.status NOT IN ('cancelled','no_show') THEN 1 END)::int AS active_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::int AS cancellations,
        MAX(b.booking_date) AS last_booking_date,
        (SELECT b2.booking_date
           FROM bookings b2
           WHERE b2.customer_id = c.id AND b2.business_id = $1
             AND b2.booking_date >= CURRENT_DATE AND b2.status NOT IN ('cancelled')
           ORDER BY b2.booking_date ASC, b2.start_time ASC LIMIT 1) AS next_booking_date,
        (SELECT s2.name FROM bookings b2
           LEFT JOIN services s2 ON s2.id = b2.service_id
           WHERE b2.customer_id = c.id AND b2.business_id = $1 AND b2.status NOT IN ('cancelled')
           ORDER BY b2.booking_date DESC LIMIT 1) AS last_service_name,
        (SELECT s2.name FROM bookings b2
           JOIN services s2 ON s2.id = b2.service_id
           WHERE b2.customer_id = c.id AND b2.status NOT IN ('cancelled')
           GROUP BY s2.name ORDER BY COUNT(*) DESC LIMIT 1) AS preferred_service,
        (SELECT sm.name FROM bookings b2
           JOIN staff_members sm ON sm.id = b2.staff_member_id
           WHERE b2.customer_id = c.id AND b2.staff_member_id IS NOT NULL
           GROUP BY sm.name ORDER BY COUNT(*) DESC LIMIT 1) AS preferred_staff
       FROM customers c
       LEFT JOIN bookings b ON b.customer_id = c.id AND b.business_id = $1
       LEFT JOIN services s ON s.id = b.service_id
       WHERE c.business_id = $1
       GROUP BY c.id
       ORDER BY last_booking_date DESC NULLS LAST, c.created_at DESC`,
      [business_id]
    );
    return rows;
  },

  async create({ business_id, full_name, phone, email, notes }) {
    return this.findOrCreate({ business_id, full_name, phone, email, notes });
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

  async updateNotes(id, business_id, notes) {
    const { rows } = await db.query(
      'UPDATE customers SET notes = $1 WHERE id = $2 AND business_id = $3 RETURNING *',
      [notes, id, business_id]
    );
    return rows[0];
  },

  async findBookings(customer_id, business_id) {
    const { rows } = await db.query(
      `SELECT b.id, b.reference_id, b.booking_date, b.start_time, b.end_time,
              b.status, b.notes, b.cancelled_reason, b.created_at,
              s.name AS service_name, s.price AS service_price, s.duration_minutes,
              sm.name AS staff_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       LEFT JOIN staff_members sm ON sm.id = b.staff_member_id
       WHERE b.customer_id = $1 AND b.business_id = $2
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [customer_id, business_id]
    );
    return rows;
  },
};

module.exports = Customer;
