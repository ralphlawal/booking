const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Notification = require('../models/Notification');
const { logAdminAction } = require('../utils/adminAudit');

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
    logAdminAction(req, { action: 'business.verify', target_type: 'business', target_id: req.params.id, details: { name: rows[0].name } });
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
    logAdminAction(req, { action: 'business.reject_verification', target_type: 'business', target_id: req.params.id, details: { name: rows[0].name } });
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

exports.updateConsumer = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { full_name, phone, email_verified, onboarding_complete } = req.body;
    const { rows } = await db.query(
      `UPDATE consumer_accounts
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           email_verified = COALESCE($3, email_verified),
           onboarding_complete = COALESCE($4, onboarding_complete)
       WHERE id = $5
       RETURNING id, email, full_name, phone, email_verified, onboarding_complete, created_at`,
      [
        full_name === undefined ? null : full_name,
        phone === undefined ? null : phone,
        email_verified === undefined ? null : !!email_verified,
        onboarding_complete === undefined ? null : !!onboarding_complete,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    logAdminAction(req, {
      action: 'consumer.update',
      target_type: 'consumer',
      target_id: req.params.id,
      details: { changed: Object.keys(req.body || {}) },
    });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/update-consumer]', err.message);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

exports.notifyConsumer = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { title, body, link } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and message are required' });

    const { rows } = await db.query('SELECT id, email FROM consumer_accounts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });

    await Notification.create({
      consumer_id: req.params.id,
      type: 'admin_message',
      title: title.trim(),
      body: body.trim(),
      link: link || '/customer/messages',
    });
    logAdminAction(req, { action: 'consumer.notify', target_type: 'consumer', target_id: req.params.id, details: { title: title.trim(), link: link || '/customer/messages' } });
    res.json({ message: 'Notification sent' });
  } catch (err) {
    console.error('[admin/notify-consumer]', err.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.getPlatformBookings = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status, payment_status, q } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 250);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`b.status = $${idx++}`);
      params.push(status);
    }
    if (payment_status && payment_status !== 'all') {
      conditions.push(`COALESCE(b.payment_status, 'unpaid') = $${idx++}`);
      params.push(payment_status);
    }
    if (q?.trim()) {
      const search = `%${q.trim()}%`;
      conditions.push(`(LOWER(b.reference_id) LIKE LOWER($${idx}) OR LOWER(biz.name) LIKE LOWER($${idx}) OR LOWER(COALESCE(ca.full_name, c.full_name, '')) LIKE LOWER($${idx}) OR LOWER(COALESCE(ca.email, c.email, '')) LIKE LOWER($${idx}))`);
      params.push(search);
      idx += 1;
    }

    params.push(limit);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT b.id, b.reference_id, b.booking_date, b.start_time, b.end_time,
              b.status, b.payment_status, b.created_at, b.notes,
              b.stripe_payment_intent_id, b.stripe_transfer_status,
              s.name AS service_name, s.price AS service_price,
              biz.id AS business_id, biz.name AS business_name, biz.slug AS business_slug,
              COALESCE(ca.full_name, c.full_name) AS customer_name,
              COALESCE(ca.email, c.email) AS customer_email,
              COALESCE(ca.phone, c.phone) AS customer_phone
       FROM bookings b
       JOIN businesses biz ON biz.id = b.business_id
       JOIN services s ON s.id = b.service_id
       LEFT JOIN customers c ON c.id = b.customer_id
       LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${idx}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin/bookings]', err.message);
    res.status(500).json({ error: 'Failed to load platform bookings' });
  }
};

exports.updatePlatformBooking = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status, payment_status, notes } = req.body;
    const allowedStatus = ['pending', 'confirmed', 'cancelled', 'completed'];
    const allowedPayments = ['unpaid', 'pending', 'paid', 'refunded'];
    if (status !== undefined && !allowedStatus.includes(status)) return res.status(400).json({ error: 'Invalid booking status' });
    if (payment_status !== undefined && !allowedPayments.includes(payment_status)) return res.status(400).json({ error: 'Invalid payment status' });

    const current = await db.query('SELECT status, payment_status, notes FROM bookings WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const { rows } = await db.query(
      `UPDATE bookings
       SET status = $1,
           payment_status = $2,
           notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, reference_id, status, payment_status, notes`,
      [
        status === undefined ? current.rows[0].status : status,
        payment_status === undefined ? current.rows[0].payment_status : payment_status,
        notes === undefined ? current.rows[0].notes : notes,
        req.params.id,
      ]
    );
    logAdminAction(req, {
      action: 'booking.update',
      target_type: 'booking',
      target_id: req.params.id,
      details: { status, payment_status, notes_changed: notes !== undefined },
    });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/update-booking]', err.message);
    res.status(500).json({ error: 'Failed to update booking' });
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
    logAdminAction(req, { action: rows[0].is_active ? 'business.reactivate' : 'business.suspend', target_type: 'business', target_id: req.params.id, details: { name: rows[0].name } });
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
    logAdminAction(req, { action: 'business.edit', target_type: 'business', target_id: req.params.id, details: { changed: Object.keys(req.body || {}) } });
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

    const [revenueByDay, revenueByBusiness, topServices, recentPayments, paymentSummary] = await Promise.all([
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
                b.payment_status, b.stripe_payment_intent_id,
                s.name AS service_name, s.price::FLOAT AS price,
                biz.name AS business_name,
                COALESCE(ca.full_name, cu.full_name) AS customer_name
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN businesses biz ON biz.id = b.business_id
         LEFT JOIN customers cu ON cu.id = b.customer_id
         LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
         WHERE ${dateFilter}
         ORDER BY b.created_at DESC LIMIT 50`
        ,
        [days]
      ),
      db.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
           COALESCE(SUM(CASE WHEN b.payment_status = 'unpaid' OR b.payment_status IS NULL THEN 1 ELSE 0 END), 0) AS unpaid,
           COALESCE(SUM(CASE WHEN b.payment_status = 'refunded' THEN 1 ELSE 0 END), 0) AS refunded,
           COALESCE(SUM(CASE WHEN b.payment_status NOT IN ('paid','unpaid','refunded') AND b.payment_status IS NOT NULL THEN 1 ELSE 0 END), 0) AS other,
           COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN s.price ELSE 0 END), 0)::FLOAT AS paid_revenue,
           COALESCE(SUM(s.price), 0)::FLOAT AS booked_value
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         WHERE ${dateFilter}`,
        [days]
      ),
    ]);

    res.json({
      period_days: days,
      revenue_by_day: revenueByDay.rows,
      top_businesses: revenueByBusiness.rows,
      top_services: topServices.rows,
      recent_payments: recentPayments.rows,
      payment_summary: paymentSummary.rows[0] || {},
    });
  } catch (err) {
    console.error('[admin/financial]', err.message);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
};

exports.getLaunchReadiness = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [
      businesses,
      services,
      bookableBusinesses,
      paidBookings,
      openDisputes,
      payoutReady,
      verifiedBusinesses,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM businesses WHERE is_active = TRUE'),
      db.query('SELECT COUNT(*) AS count FROM services'),
      db.query(
        `SELECT COUNT(DISTINCT b.id) AS count
         FROM businesses b
         JOIN services s ON s.business_id = b.id
         WHERE b.is_active = TRUE`
      ),
      db.query("SELECT COUNT(*) AS count FROM bookings WHERE payment_status = 'paid'"),
      db.query("SELECT COUNT(*) AS count FROM disputes WHERE status = 'open'"),
      db.query(
        `SELECT COUNT(*) AS count
         FROM businesses
         WHERE bank_holder_name IS NOT NULL
           AND bank_holder_name <> ''
           AND (bank_account_number IS NOT NULL OR bank_iban IS NOT NULL)`
      ),
      db.query("SELECT COUNT(*) AS count FROM businesses WHERE is_verified = TRUE OR verification_status = 'verified'"),
    ]);

    const activeBusinesses = parseInt(businesses.rows[0]?.count || 0, 10);
    const serviceCount = parseInt(services.rows[0]?.count || 0, 10);
    const bookableBusinessCount = parseInt(bookableBusinesses.rows[0]?.count || 0, 10);
    const paidBookingCount = parseInt(paidBookings.rows[0]?.count || 0, 10);
    const openDisputeCount = parseInt(openDisputes.rows[0]?.count || 0, 10);
    const payoutReadyCount = parseInt(payoutReady.rows[0]?.count || 0, 10);
    const verifiedCount = parseInt(verifiedBusinesses.rows[0]?.count || 0, 10);

    const checks = [
      {
        key: 'database',
        label: 'Production database',
        status: process.env.DATABASE_URL ? 'ready' : 'warning',
        detail: process.env.DATABASE_URL ? 'DATABASE_URL is configured.' : 'Using local SQLite. Use PostgreSQL before public launch.',
      },
      {
        key: 'database_backups',
        label: 'Database backups',
        status: process.env.DB_BACKUPS_ENABLED === 'true' || process.env.DATABASE_BACKUP_URL || process.env.RENDER_POSTGRES_BACKUPS === 'true' ? 'ready' : 'warning',
        detail: process.env.DB_BACKUPS_ENABLED === 'true' || process.env.DATABASE_BACKUP_URL || process.env.RENDER_POSTGRES_BACKUPS === 'true'
          ? 'Database backup configuration is marked as enabled.'
          : 'Confirm automated production database backups and restore access before launch.',
      },
      {
        key: 'security',
        label: 'JWT secret',
        status: process.env.JWT_SECRET && process.env.JWT_SECRET !== 'bookam-jwt-secret-change-in-prod' ? 'ready' : 'blocked',
        detail: process.env.JWT_SECRET && process.env.JWT_SECRET !== 'bookam-jwt-secret-change-in-prod'
          ? 'JWT_SECRET is configured.'
          : 'Set a strong JWT_SECRET in production.',
      },
      {
        key: 'frontend_url',
        label: 'Production frontend URL',
        status: /^https:\/\/.+/i.test(process.env.FRONTEND_URL || '') ? 'ready' : 'blocked',
        detail: /^https:\/\/.+/i.test(process.env.FRONTEND_URL || '')
          ? `FRONTEND_URL is set to ${process.env.FRONTEND_URL}.`
          : 'Set FRONTEND_URL to the live https:// app URL so email links, redirects, and CORS work.',
      },
      {
        key: 'cors',
        label: 'CORS origins',
        status: process.env.CORS_ORIGINS || process.env.FRONTEND_URL ? 'ready' : 'warning',
        detail: process.env.CORS_ORIGINS
          ? 'CORS_ORIGINS is configured.'
          : 'Using default production origins. Set CORS_ORIGINS if deploying to additional domains.',
      },
      {
        key: 'admin_password',
        label: 'Admin support password',
        status: process.env.ADMIN_SUPPORT_PASSWORD || process.env.ADMIN_CHAT_PASSWORD ? 'ready' : 'blocked',
        detail: process.env.ADMIN_SUPPORT_PASSWORD || process.env.ADMIN_CHAT_PASSWORD
          ? 'Admin support login password is configured.'
          : 'Set ADMIN_SUPPORT_PASSWORD before launch.',
      },
      {
        key: 'email',
        label: 'Transactional email',
        status: process.env.RESEND_API_KEY ? 'ready' : 'warning',
        detail: process.env.RESEND_API_KEY ? 'Email delivery is configured.' : 'RESEND_API_KEY is missing. Emails will be logged, not sent.',
      },
      {
        key: 'stripe',
        label: 'Stripe payments',
        status: process.env.STRIPE_SECRET_KEY ? 'ready' : 'blocked',
        detail: process.env.STRIPE_SECRET_KEY ? 'Stripe secret key is configured.' : 'STRIPE_SECRET_KEY is missing. Online payments cannot run.',
      },
      {
        key: 'stripe_webhook',
        label: 'Stripe webhook',
        status: process.env.STRIPE_WEBHOOK_SECRET ? 'ready' : 'blocked',
        detail: process.env.STRIPE_WEBHOOK_SECRET ? 'Stripe webhook signing secret is configured.' : 'STRIPE_WEBHOOK_SECRET is missing. Payment status may not update.',
      },
      {
        key: 'push_notifications',
        label: 'Real push notifications',
        status: process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? 'ready' : 'warning',
        detail: process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
          ? 'Web Push keys are configured.'
          : 'Browser polling works, but real phone/web push needs VAPID keys and a service worker.',
      },
      {
        key: 'media_storage',
        label: 'External media storage',
        status: process.env.CLOUDINARY_URL || process.env.S3_BUCKET || process.env.R2_BUCKET ? 'ready' : 'warning',
        detail: process.env.CLOUDINARY_URL || process.env.S3_BUCKET || process.env.R2_BUCKET
          ? 'External media storage appears configured.'
          : 'Images/videos are still stored inline. Use Cloudinary, S3, or R2 before heavy public usage.',
      },
      {
        key: 'monitoring',
        label: 'Error monitoring',
        status: process.env.SENTRY_DSN ? 'ready' : 'warning',
        detail: process.env.SENTRY_DSN ? 'Sentry is configured.' : 'Add Sentry or equivalent before public launch so crashes are visible.',
      },
      {
        key: 'legal_pages',
        label: 'Legal and policy pages',
        status: 'ready',
        detail: 'Terms, privacy, and cookie policy routes are available at /legal/terms, /legal/privacy, and /legal/cookies.',
      },
      {
        key: 'support_contact',
        label: 'Support contact path',
        status: process.env.RESEND_API_KEY ? 'ready' : 'warning',
        detail: process.env.RESEND_API_KEY
          ? 'Support and transactional email can be delivered.'
          : 'Support exists in-app, but outbound email delivery is not configured.',
      },
      {
        key: 'slot_protection',
        label: 'Double-booking protection',
        status: 'ready',
        detail: 'Active booking slots are protected with a database-level unique index and idempotency keys.',
      },
      {
        key: 'audit_logs',
        label: 'Admin audit logs',
        status: 'ready',
        detail: 'Sensitive admin actions are recorded in admin_audit_logs.',
      },
      {
        key: 'businesses',
        label: 'Active businesses',
        status: activeBusinesses > 0 ? 'ready' : 'warning',
        detail: `${activeBusinesses} active business${activeBusinesses === 1 ? '' : 'es'} on the platform.`,
      },
      {
        key: 'services',
        label: 'Bookable services',
        status: serviceCount > 0 && bookableBusinessCount > 0 ? 'ready' : 'warning',
        detail: `${serviceCount} service${serviceCount === 1 ? '' : 's'} across ${bookableBusinessCount} bookable business${bookableBusinessCount === 1 ? '' : 'es'}.`,
      },
      {
        key: 'payouts',
        label: 'Payout readiness',
        status: activeBusinesses === 0 || payoutReadyCount > 0 ? 'ready' : 'warning',
        detail: `${payoutReadyCount} business${payoutReadyCount === 1 ? '' : 'es'} have bank details saved.`,
      },
      {
        key: 'verification',
        label: 'Verified businesses',
        status: verifiedCount > 0 ? 'ready' : 'warning',
        detail: `${verifiedCount} business${verifiedCount === 1 ? '' : 'es'} currently verified.`,
      },
      {
        key: 'disputes',
        label: 'Open disputes',
        status: openDisputeCount === 0 ? 'ready' : 'warning',
        detail: openDisputeCount === 0 ? 'No open disputes.' : `${openDisputeCount} dispute${openDisputeCount === 1 ? '' : 's'} need attention.`,
      },
      {
        key: 'paid_bookings',
        label: 'Payment records',
        status: paidBookingCount > 0 ? 'ready' : 'warning',
        detail: `${paidBookingCount} paid booking${paidBookingCount === 1 ? '' : 's'} recorded.`,
      },
    ];

    const blocked = checks.filter(c => c.status === 'blocked').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    res.json({
      launch_ready: blocked === 0,
      blocked,
      warnings,
      checked_at: new Date().toISOString(),
      checks,
    });
  } catch (err) {
    console.error('[admin/launch-readiness]', err.message);
    res.status(500).json({ error: 'Failed to load launch readiness' });
  }
};

// GET /api/admin/manual-payouts
// Lists businesses with manual bank details + their pending payout totals.
exports.getManualPayouts = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query(`
      SELECT
        b.id,
        b.name,
        b.email,
        b.bank_holder_name,
        b.bank_account_number,
        b.bank_sort_code,
        b.bank_iban,
        b.bank_bic,
        b.bank_routing_number,
        b.bank_name,
        b.bank_country,
        b.bank_currency,
        b.bank_updated_at,
        b.stripe_account_id,
        b.stripe_onboarding_complete,
        COALESCE(SUM(CASE WHEN bk.payment_status = 'paid' AND (bk.stripe_transfer_status IS NULL OR bk.stripe_transfer_status = 'pending') THEN s.price ELSE 0 END), 0) AS pending_payout,
        COUNT(CASE WHEN bk.payment_status = 'paid' AND (bk.stripe_transfer_status IS NULL OR bk.stripe_transfer_status = 'pending') THEN 1 END) AS pending_booking_count,
        COUNT(CASE WHEN bk.stripe_transfer_status = 'manual_paid' THEN 1 END) AS paid_count
      FROM businesses b
      LEFT JOIN bookings bk ON bk.business_id = b.id
      LEFT JOIN services s ON s.id = bk.service_id
      WHERE b.bank_holder_name IS NOT NULL AND b.bank_holder_name <> ''
      GROUP BY b.id
      ORDER BY pending_payout DESC, b.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('[admin/manual-payouts]', err.message);
    res.status(500).json({ error: 'Failed to load manual payouts' });
  }
};

// POST /api/admin/manual-payouts/:businessId/mark-paid
// Marks all pending bookings for a business as manually paid out.
exports.markManualPaid = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { businessId } = req.params;
  try {
    const { rowCount } = await db.query(`
      UPDATE bookings
      SET stripe_transfer_status = 'manual_paid'
      WHERE business_id = $1
        AND payment_status = 'paid'
        AND (stripe_transfer_status IS NULL OR stripe_transfer_status = 'pending')
    `, [businessId]);
    res.json({ updated: rowCount });
    logAdminAction(req, { action: 'payout.mark_manual_paid', target_type: 'business', target_id: businessId, details: { updated_bookings: rowCount } });
  } catch (err) {
    console.error('[admin/mark-manual-paid]', err.message);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
};

exports.getAuditLogs = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 250);
    const { rows } = await db.query(
      `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows.map(row => {
      if (typeof row.details === 'string') {
        try { return { ...row, details: JSON.parse(row.details) }; } catch {}
      }
      return row;
    }));
  } catch (err) {
    console.error('[admin/audit]', err.message);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
};
