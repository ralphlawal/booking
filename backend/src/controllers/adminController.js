const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function isAdmin(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return false;
  try {
    const p = jwt.verify(h.split(' ')[1], JWT_SECRET);
    return p.type === 'admin';
  } catch { return false; }
}

exports.getStats = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const weekFilter = process.env.DATABASE_URL
      ? "created_at > NOW() - INTERVAL '7 days'"
      : "datetime(created_at) > datetime('now', '-7 days')";
    const [bizCount, consumerCount, bookingCount, revenueRow, pendingVerif, newThisWeek] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM businesses WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) AS count FROM consumer_accounts'),
      db.query('SELECT COUNT(*) AS count FROM bookings'),
      db.query("SELECT COALESCE(SUM(s.price),0) AS total FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.payment_status = 'paid'"),
      db.query("SELECT COUNT(*) AS count FROM businesses WHERE verification_status = 'pending'"),
      db.query(`SELECT COUNT(*) AS count FROM bookings WHERE ${weekFilter}`),
    ]);
    res.json({
      businesses: parseInt(bizCount.rows[0].count),
      consumers: parseInt(consumerCount.rows[0].count),
      bookings: parseInt(bookingCount.rows[0].count),
      revenue: parseFloat(revenueRow.rows[0].total).toFixed(2),
      pending_verifications: parseInt(pendingVerif.rows[0].count),
      bookings_this_week: parseInt(newThisWeek.rows[0].count),
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

exports.getBusinesses = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.name, b.slug, b.email, b.phone, b.category, b.location,
              b.is_verified, b.verification_status, b.verification_requested_at,
              b.verification_details, b.is_active, b.created_at,
              COUNT(bk.id) AS total_bookings
       FROM businesses b
       LEFT JOIN bookings bk ON bk.business_id = b.id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    res.json(rows.map((business) => {
      if (typeof business.verification_details === 'string') {
        try {
          return { ...business, verification_details: JSON.parse(business.verification_details) };
        } catch {
          return { ...business, verification_details: {} };
        }
      }
      return business;
    }));
  } catch (err) {
    console.error('[admin/businesses]', err.message);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
};

exports.verifyBusiness = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(
      `UPDATE businesses
       SET is_verified = TRUE, verification_status = 'verified', verified_at = NOW()
       WHERE id = $1 RETURNING id, name, is_verified, verification_status`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business not found' });
    res.json({ message: `${rows[0].name} has been verified`, business: rows[0] });
  } catch (err) {
    console.error('[admin/verify]', err.message);
    res.status(500).json({ error: 'Failed to verify business' });
  }
};

exports.rejectVerification = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(
      `UPDATE businesses
       SET verification_status = 'rejected', is_verified = FALSE
       WHERE id = $1 RETURNING id, name, verification_status`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business not found' });
    res.json({ message: `Verification rejected for ${rows[0].name}`, business: rows[0] });
  } catch (err) {
    console.error('[admin/reject-verify]', err.message);
    res.status(500).json({ error: 'Failed to reject verification' });
  }
};

exports.getConsumers = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(
      `SELECT ca.id, ca.email, ca.full_name, ca.phone, ca.created_at,
              ca.email_verified, ca.onboarding_complete,
              ca.referral_code, ca.referral_credits,
              COUNT(b.id) AS total_bookings
       FROM consumer_accounts ca
       LEFT JOIN bookings b ON b.consumer_id = ca.id
       GROUP BY ca.id
       ORDER BY ca.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin/consumers]', err.message);
    res.status(500).json({ error: 'Failed to load consumers' });
  }
};

exports.suspendBusiness = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { active } = req.body;
    const { rows } = await db.query(
      `UPDATE businesses SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active`,
      [!!active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business not found' });
    const action = rows[0].is_active ? 'reactivated' : 'suspended';
    res.json({ message: `${rows[0].name} has been ${action}`, business: rows[0] });
  } catch (err) {
    console.error('[admin/suspend]', err.message);
    res.status(500).json({ error: 'Failed to update business status' });
  }
};

exports.editBusiness = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { name, description, category, location, phone, email } = req.body;
    const { rows } = await db.query(
      `UPDATE businesses
       SET name=COALESCE($1,name), description=COALESCE($2,description),
           category=COALESCE($3,category), location=COALESCE($4,location),
           phone=COALESCE($5,phone), email=COALESCE($6,email)
       WHERE id=$7 RETURNING id,name,description,category,location,phone,email,is_verified,is_active`,
      [name||null, description||null, category||null, location||null, phone||null, email||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/edit-business]', err.message);
    res.status(500).json({ error: 'Failed to update business' });
  }
};

exports.getFinancialReport = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { period = '30' } = req.query; // days
    const days = Math.min(parseInt(period) || 30, 365);
    const dateFilter = process.env.DATABASE_URL
      ? "b.created_at > NOW() - ($1 || ' days')::INTERVAL"
      : "datetime(b.created_at) > datetime('now', '-' || $1 || ' days')";

    const [revenueByDay, revenueByBusiness, topServices, recentPayments] = await Promise.all([
      // Revenue per day
      db.query(
        `SELECT DATE(b.created_at) AS day,
                COUNT(*) AS paid_bookings,
                COALESCE(SUM(s.price),0)::FLOAT AS revenue
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE b.payment_status = 'paid' AND ${dateFilter}
         GROUP BY DATE(b.created_at) ORDER BY day ASC`,
        [days]
      ),
      // Top businesses by revenue
      db.query(
        `SELECT biz.id AS business_id, biz.name, biz.category,
                COUNT(b.id) AS paid_bookings,
                COALESCE(SUM(s.price),0)::FLOAT AS revenue
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN businesses biz ON biz.id = b.business_id
         WHERE b.payment_status = 'paid' AND ${dateFilter}
         GROUP BY biz.id ORDER BY revenue DESC LIMIT 10`,
        [days]
      ),
      // Top services
      db.query(
        `SELECT s.name AS service_name, biz.name AS business_name,
                COUNT(b.id) AS bookings,
                COALESCE(SUM(s.price),0)::FLOAT AS revenue
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN businesses biz ON biz.id = b.business_id
         WHERE ${dateFilter}
         GROUP BY s.id, s.name, biz.name ORDER BY bookings DESC LIMIT 10`,
        [days]
      ),
      // Recent paid bookings
      db.query(
        `SELECT b.id, b.reference_id, b.booking_date, b.created_at,
                s.name AS service_name, s.price::FLOAT AS price,
                biz.name AS business_name,
                COALESCE(ca.full_name, cu.full_name) AS customer_name
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN businesses biz ON biz.id = b.business_id
         LEFT JOIN customers cu ON cu.id = b.customer_id
         LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
         WHERE b.payment_status = 'paid'
         ORDER BY b.created_at DESC LIMIT 50`
      ),
    ]);

    res.json({
      period_days: days,
      revenue_by_day: revenueByDay.rows,
      top_businesses: revenueByBusiness.rows,
      top_services: topServices.rows,
      recent_payments: recentPayments.rows,
    });
  } catch (err) {
    console.error('[admin/financial]', err.message);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
};
