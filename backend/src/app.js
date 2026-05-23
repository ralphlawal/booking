require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using insecure fallback — set JWT_SECRET in Render env vars.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// Security — disable CSP/COEP on API responses (they belong on HTML, not JSON)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(cors({
  origin: (origin, cb) => {
    // Allow all origins — tokens are in Authorization headers (not cookies),
    // so reflecting the origin with credentials is safe.
    cb(null, true);
  },
  credentials: true,
}));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } }));
app.use('/api/consumer/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Too many registrations from this IP' } }));
app.use('/api/consumer/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts' } }));
app.use('/api/bookings/public', rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many bookings' } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/services', require('./routes/services'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/consumer', require('./routes/consumer'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/chat', require('./routes/chat'));

// New feature routes
const { authenticate, attachBusiness } = require('./middleware/auth');
const staffCtrl = require('./controllers/staffController');
const photosCtrl = require('./controllers/photosController');
const waitlistCtrl = require('./controllers/waitlistController');
const promoCtrl = require('./controllers/promoController');
const intakeCtrl = require('./controllers/intakeController');

// Staff
app.get('/api/staff', authenticate, attachBusiness, staffCtrl.list);
app.post('/api/staff', authenticate, attachBusiness, staffCtrl.create);
app.put('/api/staff/:id', authenticate, attachBusiness, staffCtrl.update);
app.delete('/api/staff/:id', authenticate, attachBusiness, staffCtrl.remove);
app.get('/api/staff/public/:slug', staffCtrl.listPublic);

// Photos
app.get('/api/photos/public/:slug', photosCtrl.listPublic);
app.get('/api/photos', authenticate, attachBusiness, photosCtrl.list);
app.post('/api/photos', authenticate, attachBusiness, photosCtrl.uploadMiddleware, photosCtrl.upload);
app.delete('/api/photos/:id', authenticate, attachBusiness, photosCtrl.remove);
app.put('/api/photos/reorder', authenticate, attachBusiness, photosCtrl.reorder);

// Waitlist
app.post('/api/waitlist/:slug', waitlistCtrl.join);
app.get('/api/waitlist', authenticate, attachBusiness, waitlistCtrl.list);
app.patch('/api/waitlist/:id', authenticate, attachBusiness, waitlistCtrl.update);
app.delete('/api/waitlist/:id', authenticate, attachBusiness, waitlistCtrl.remove);

// Promo codes
app.get('/api/promo', authenticate, attachBusiness, promoCtrl.list);
app.post('/api/promo', authenticate, attachBusiness, promoCtrl.create);
app.patch('/api/promo/:id', authenticate, attachBusiness, promoCtrl.update);
app.delete('/api/promo/:id', authenticate, attachBusiness, promoCtrl.remove);
app.post('/api/promo/validate', promoCtrl.validate);

// Intake forms
app.get('/api/intake/public/:slug', intakeCtrl.getPublic);
app.get('/api/intake', authenticate, attachBusiness, intakeCtrl.get);
app.put('/api/intake', authenticate, attachBusiness, intakeCtrl.save);
app.get('/api/intake/responses', authenticate, attachBusiness, intakeCtrl.listResponses);
app.post('/api/intake/respond', intakeCtrl.respond);

// Walk-in booking
const bookingsCtrl = require('./controllers/bookingsController');
app.post('/api/bookings/walkin', authenticate, attachBusiness, bookingsCtrl.createWalkin);
app.post('/api/bookings/ref/:ref/reschedule-request', bookingsCtrl.rescheduleRequest);

// Broadcast notifications
const bcastCtrl = require('./controllers/broadcastController');
app.get('/api/broadcasts/active', bcastCtrl.getActive);
app.get('/api/broadcasts', bcastCtrl.list);
app.post('/api/broadcasts', bcastCtrl.create);
app.patch('/api/broadcasts/:id/deactivate', bcastCtrl.deactivate);

// Admin management panel
const adminCtrl = require('./controllers/adminController');
app.get('/api/admin/stats', adminCtrl.getStats);
app.get('/api/admin/businesses', adminCtrl.getBusinesses);
app.patch('/api/admin/businesses/:id/verify', adminCtrl.verifyBusiness);
app.patch('/api/admin/businesses/:id/reject-verify', adminCtrl.rejectVerification);
app.patch('/api/admin/businesses/:id/suspend', adminCtrl.suspendBusiness);
app.put('/api/admin/businesses/:id', adminCtrl.editBusiness);
app.get('/api/admin/consumers', adminCtrl.getConsumers);
app.get('/api/admin/financial', adminCtrl.getFinancialReport);

// Review replies (business authenticated)
const reviewsCtrl = require('./controllers/reviewsController');
app.post('/api/reviews/:id/reply', authenticate, attachBusiness, reviewsCtrl.reply);
app.delete('/api/reviews/:id/reply', authenticate, attachBusiness, reviewsCtrl.deleteReply);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startReminderJob() {
  const Booking = require('./models/Booking');
  const { sendReminder } = require('./services/emailService');

  const run = async () => {
    try {
      const { reminders24h, reminders1h } = await Booking.getPendingReminders();
      for (const b of reminders24h) {
        await sendReminder(b, 24);
        await Booking.markReminderSent(b.id, '24h');
        console.log(`[Reminder 24h] Sent to ${b.customer_email} for booking ${b.reference_id}`);
      }
      for (const b of reminders1h) {
        await sendReminder(b, 1);
        await Booking.markReminderSent(b.id, '1h');
        console.log(`[Reminder 1h] Sent to ${b.customer_email} for booking ${b.reference_id}`);
      }
    } catch (err) {
      console.error('[Reminder job error]', err.message);
    }
  };

  await run();
  setInterval(run, 15 * 60 * 1000); // every 15 minutes
  console.log('Reminder job started (runs every 15 min)');
}

// Auto-migrate then start
async function start() {
  try {
    if (process.env.DATABASE_URL) {
      const { pool } = require('./config/database.pg');
      const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_initial_schema.sql'), 'utf8');
      await pool.query(sql);
      const sql2 = fs.readFileSync(path.join(__dirname, '../migrations/002_consumer_discovery.sql'), 'utf8');
      await pool.query(sql2);
      const sql3 = fs.readFileSync(path.join(__dirname, '../migrations/003_consumer_auth_extras.sql'), 'utf8');
      await pool.query(sql3);
      const sql4 = fs.readFileSync(path.join(__dirname, '../migrations/004_verification.sql'), 'utf8');
      await pool.query(sql4);
      const sql5 = fs.readFileSync(path.join(__dirname, '../migrations/005_notifications.sql'), 'utf8');
      await pool.query(sql5);
      const sql6 = fs.readFileSync(path.join(__dirname, '../migrations/006_email_verification.sql'), 'utf8');
      await pool.query(sql6);
      const sql7 = fs.readFileSync(path.join(__dirname, '../migrations/007_customer_notes.sql'), 'utf8');
      await pool.query(sql7);
      const sql8 = fs.readFileSync(path.join(__dirname, '../migrations/008_chat.sql'), 'utf8');
      await pool.query(sql8);
      const sql9 = fs.readFileSync(path.join(__dirname, '../migrations/009_stripe_payments.sql'), 'utf8');
      await pool.query(sql9);
      const sql10 = fs.readFileSync(path.join(__dirname, '../migrations/010_bank_verification.sql'), 'utf8');
      await pool.query(sql10);
      const sql11 = fs.readFileSync(path.join(__dirname, '../migrations/011_trust_system.sql'), 'utf8');
      await pool.query(sql11);
      const sql12 = fs.readFileSync(path.join(__dirname, '../migrations/012_consumer_location.sql'), 'utf8');
      await pool.query(sql12);
      const sql13 = fs.readFileSync(path.join(__dirname, '../migrations/013_broadcasts_referrals.sql'), 'utf8');
      await pool.query(sql13);
      const sql14 = fs.readFileSync(path.join(__dirname, '../migrations/014_new_features.sql'), 'utf8');
      await pool.query(sql14);
      console.log('PostgreSQL migrations applied.');

      console.log('Database ready.');
    } else {
      const { db } = require('./config/database.sqlite');
      const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_sqlite_schema.sql'), 'utf8');
      db.exec(sql);
      const addColumn = (table, column) => {
        try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`); } catch {}
      };
      for (const col of ['reset_token TEXT', 'reset_token_expires TEXT', 'firebase_uid TEXT']) {
        addColumn('users', col);
      }
      for (const col of ['reminder_24h_sent INTEGER DEFAULT 0', 'reminder_1h_sent INTEGER DEFAULT 0']) {
        addColumn('bookings', col);
      }
      for (const col of ['is_verified INTEGER DEFAULT 0', 'latitude REAL', 'longitude REAL', "verification_status TEXT DEFAULT 'pending'", 'verified_at TEXT', 'verification_requested_at TEXT', 'verification_rejected_reason TEXT', 'verification_notes TEXT', 'stripe_account_id TEXT', 'stripe_onboarding_complete INTEGER DEFAULT 0']) {
        addColumn('businesses', col);
      }
      for (const col of ['deposit_required INTEGER DEFAULT 0', 'deposit_amount REAL DEFAULT 0', 'category TEXT']) {
        addColumn('services', col);
      }
      for (const col of ['consumer_id TEXT', 'mandate_id TEXT', 'stripe_payment_intent_id TEXT', "payment_status TEXT DEFAULT 'unpaid'", 'staff_member_id TEXT', 'promo_code TEXT', 'discount_amount REAL DEFAULT 0', 'intake_response_id TEXT']) {
        addColumn('bookings', col);
      }
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS consumer_accounts (
          id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL, phone TEXT, avatar_url TEXT,
          location_text TEXT, latitude REAL, longitude REAL,
          service_preferences TEXT DEFAULT '[]', onboarding_complete INTEGER DEFAULT 0,
          email_verified INTEGER DEFAULT 1, email_verify_token TEXT,
          reset_token TEXT, reset_token_expires TEXT,
          referral_code TEXT, referred_by TEXT, referral_credits INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS consumer_preferences (
          id TEXT PRIMARY KEY, consumer_id TEXT NOT NULL, business_id TEXT NOT NULL,
          service_id TEXT, notes TEXT, last_booked_at TEXT, total_bookings INTEGER DEFAULT 0,
          UNIQUE(consumer_id, business_id)
        )`);
      } catch {}
      try { db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1`); } catch {}
      try { db.exec(`ALTER TABLE users ADD COLUMN email_verify_token TEXT`); } catch {}
      try { db.exec(`ALTER TABLE consumer_accounts ADD COLUMN email_verified INTEGER DEFAULT 1`); } catch {}
      try { db.exec(`ALTER TABLE consumer_accounts ADD COLUMN email_verify_token TEXT`); } catch {}
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY, consumer_id TEXT NOT NULL, type TEXT NOT NULL,
          title TEXT NOT NULL, body TEXT, link TEXT,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`);
      } catch {}
      try { db.exec(`ALTER TABLE customers ADD COLUMN notes TEXT`); } catch {}
      for (const col of ['location_text TEXT', 'latitude REAL', 'longitude REAL', 'service_preferences TEXT', 'onboarding_complete INTEGER DEFAULT 0']) {
        try { db.exec(`ALTER TABLE consumer_accounts ADD COLUMN ${col}`); } catch {}
      }
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS service_confirmations (
          id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, consumer_id TEXT,
          confirmed_at TEXT DEFAULT (datetime('now')), UNIQUE(booking_id)
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS disputes (
          id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, consumer_id TEXT,
          reason TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'open',
          admin_notes TEXT, stripe_refund_id TEXT,
          created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, UNIQUE(booking_id)
        )`);
      } catch {}
      try {
        db.exec(`ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id TEXT`);
        db.exec(`ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`);
      } catch {}
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS broadcast_notifications (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info', is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')), expires_at TEXT
        )`);
      } catch {}
      for (const col of ['referral_code TEXT', 'referred_by TEXT', 'referral_credits INTEGER DEFAULT 0']) {
        try { db.exec(`ALTER TABLE consumer_accounts ADD COLUMN ${col}`); } catch {}
      }
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS referral_events (
          id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, referred_id TEXT,
          referral_code TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
        )`);
      } catch {}
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS chat_rooms (
          id TEXT PRIMARY KEY, type TEXT NOT NULL,
          business_id TEXT, consumer_id TEXT,
          subject TEXT, status TEXT NOT NULL DEFAULT 'open',
          last_message_at TEXT DEFAULT (datetime('now')),
          created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY, room_id TEXT NOT NULL,
          sender_type TEXT NOT NULL, sender_name TEXT,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )`);
      } catch {}
      try {
        db.exec(`CREATE TABLE IF NOT EXISTS staff_members (
          id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT,
          bio TEXT, avatar_url TEXT, phone TEXT, email TEXT, working_days TEXT DEFAULT '[]',
          opening_time TEXT DEFAULT '09:00', closing_time TEXT DEFAULT '18:00',
          is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS business_photos (
          id TEXT PRIMARY KEY, business_id TEXT NOT NULL, url TEXT NOT NULL,
          caption TEXT, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS review_replies (
          id TEXT PRIMARY KEY, review_id TEXT NOT NULL UNIQUE, business_id TEXT NOT NULL,
          reply_text TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS intake_forms (
          id TEXT PRIMARY KEY, business_id TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT 'Pre-appointment form',
          questions TEXT NOT NULL DEFAULT '[]', is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS intake_responses (
          id TEXT PRIMARY KEY, intake_form_id TEXT NOT NULL, booking_id TEXT,
          consumer_name TEXT, responses TEXT NOT NULL DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS waitlist (
          id TEXT PRIMARY KEY, business_id TEXT NOT NULL, service_id TEXT, consumer_id TEXT,
          consumer_name TEXT NOT NULL, consumer_email TEXT NOT NULL, consumer_phone TEXT,
          requested_date TEXT, preferred_time TEXT, status TEXT NOT NULL DEFAULT 'waiting',
          created_at TEXT DEFAULT (datetime('now'))
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS promo_codes (
          id TEXT PRIMARY KEY, business_id TEXT NOT NULL, code TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'percent', value REAL NOT NULL,
          min_order_amount REAL DEFAULT 0, max_uses INTEGER, uses_count INTEGER DEFAULT 0,
          valid_from TEXT, valid_until TEXT, is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')), UNIQUE(business_id, code)
        )`);
      } catch {}
    }
  } catch (err) {
    console.error('Startup migration error:', err.message);
  }

  startReminderJob();

  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => console.log(`BookAm API running on port ${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set PORT to a free port, for example: PORT=5101 npm start`);
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`Cannot listen on port ${PORT}: ${err.message}`);
    } else {
      console.error('Server listen error:', err);
    }
    process.exit(1);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
