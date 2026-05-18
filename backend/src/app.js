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
      console.log('PostgreSQL migrations applied.');

      // Seed demo account if no users exist
      const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
      if (parseInt(rows[0].c) === 0) {
        console.log('Empty database — seeding demo account...');
        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');
        const hash = await bcrypt.hash('demo1234', 12);
        const uid = crypto.randomUUID(), bid = crypto.randomUUID();
        await pool.query(`INSERT INTO users (id,email,password_hash,full_name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [uid,'demo@bookly.com',hash,'Demo Owner']);
        const { rows: [user] } = await pool.query('SELECT id FROM users WHERE email=$1',['demo@bookly.com']);
        await pool.query(`INSERT INTO businesses (id,user_id,name,slug,description,phone,email,location,category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,[bid,user.id,'Smooth Cuts Barbershop','smoothcuts','Premium haircuts and grooming services','+1-555-0100','smoothcuts@demo.com','123 Main St, New York','barber']);
        const { rows: [biz] } = await pool.query('SELECT id FROM businesses WHERE slug=$1',['smoothcuts']);
        const svcData = [['Classic Haircut','Clean fade with edge up',30,30],['Beard Trim','Shape and clean beard trim',20,20],['Full Grooming Package','Haircut + Beard + Wash',65,75]];
        for (const [n,d,p,dur] of svcData) await pool.query(`INSERT INTO services (id,business_id,name,description,price,duration_minutes) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[crypto.randomUUID(),biz.id,n,d,p,dur]);
        await pool.query(`INSERT INTO availability_settings (id,business_id,working_days,opening_time,closing_time,slot_interval_minutes) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[crypto.randomUUID(),biz.id,JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday']),'09:00','18:00',30]);
        console.log('Demo account seeded: demo@bookly.com / demo1234');
      }
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
