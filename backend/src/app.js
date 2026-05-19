require('dotenv').config();
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
    if (!origin) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (origin.endsWith('.bookam.business') || origin === 'https://bookam.business' || origin === 'https://www.bookam.business') return cb(null, true);
    if (origin.includes('localhost')) return cb(null, true);
    if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
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
app.use('/api/ai', require('./routes/ai'));

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
      console.log('PostgreSQL migrations applied.');

      console.log('Database ready.');
    } else {
      const { db } = require('./config/database.sqlite');
      const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_sqlite_schema.sql'), 'utf8');
      db.exec(sql);
      for (const col of ['reset_token TEXT', 'reset_token_expires TEXT', 'firebase_uid TEXT']) {
        try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch {}
      }
      for (const col of ['reminder_24h_sent INTEGER DEFAULT 0', 'reminder_1h_sent INTEGER DEFAULT 0']) {
        try { db.exec(`ALTER TABLE bookings ADD COLUMN ${col}`); } catch {}
      }
      try { db.exec(`ALTER TABLE businesses ADD COLUMN is_verified INTEGER DEFAULT 0`); } catch {}
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
    }
  } catch (err) {
    console.error('Startup migration error:', err.message);
  }

  startReminderJob();

  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`BookAm API running on port ${PORT}`));
}

start();
module.exports = app;
