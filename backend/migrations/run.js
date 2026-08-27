require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  if (process.env.DATABASE_URL) {
    // PostgreSQL
    const { pool } = require('../src/config/database.pg');
    const client = await pool.connect();
    try {
      console.log('Running PostgreSQL migrations…');
      const files = fs.readdirSync(__dirname)
        .filter((file) => /^\d+_.*\.sql$/.test(file) && !file.includes('sqlite'))
        .sort();

      await client.query('BEGIN');
      for (const file of files) {
        console.log(`Applying ${file}…`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        await client.query(sql);
      }
      await client.query('COMMIT');
      console.log('PostgreSQL migrations completed.');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  } else {
    // SQLite
    const { db } = require('../src/config/database.sqlite');
    console.log('Running SQLite migrations…');
    const sql = fs.readFileSync(path.join(__dirname, '001_sqlite_schema.sql'), 'utf8');
    db.exec(sql);
    const addColumn = (table, column) => {
      try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`); } catch {}
    };
    addColumn('bookings', 'idempotency_key TEXT');
    try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key <> ''`); } catch {}
    try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot ON bookings(business_id, booking_date, start_time) WHERE status <> 'cancelled'`); } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_business_status_date ON bookings(business_id, status, booking_date DESC)`); } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_customer_business_date ON bookings(customer_id, business_id, booking_date DESC)`); } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON reviews(business_id, created_at DESC)`); } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_waitlist_business_status_created ON waitlist(business_id, status, created_at DESC)`); } catch {}
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY, admin_role TEXT, action TEXT NOT NULL,
        target_type TEXT, target_id TEXT, details TEXT DEFAULT '{}',
        ip_address TEXT, user_agent TEXT, created_at TEXT DEFAULT (datetime('now'))
      )`);
    } catch {}
    for (const col of [
      'bank_holder_name TEXT',
      'bank_sort_code TEXT',
      'bank_account_number TEXT',
      'bank_country TEXT',
      'bank_currency TEXT',
      'bank_name TEXT',
      'bank_iban TEXT',
      'bank_bic TEXT',
      'bank_routing_number TEXT',
      'bank_updated_at TEXT',
    ]) {
      addColumn('businesses', col);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS business_posts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'photo',
      caption TEXT,
      image_url TEXT,
      cta_label TEXT,
      cta_service_id TEXT,
      offer_text TEXT,
      offer_expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      booking_clicks INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    // Keep local SQLite development aligned with the PostgreSQL operations layer
    // from migration 038. Processor references are identifiers only, never card data.
    db.exec(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, sku TEXT,
      description TEXT, price REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0, low_stock_threshold INTEGER NOT NULL DEFAULT 0,
      supplier TEXT, category TEXT, is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, sku)
    );
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, product_id TEXT NOT NULL,
      type TEXT NOT NULL, quantity INTEGER NOT NULL, unit_cost REAL, note TEXT,
      order_id TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, customer_id TEXT, booking_id TEXT,
      order_number TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'pos', status TEXT NOT NULL DEFAULT 'open',
      currency TEXT NOT NULL DEFAULT 'gbp', subtotal REAL NOT NULL DEFAULT 0, discount_total REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0, tip_total REAL NOT NULL DEFAULT 0, gift_card_total REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0, paid_total REAL NOT NULL DEFAULT 0, note TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, order_number)
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, item_type TEXT NOT NULL, reference_id TEXT,
      name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0, line_total REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, order_id TEXT, booking_id TEXT,
      provider TEXT NOT NULL DEFAULT 'manual', provider_reference TEXT, payment_method TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'payment', status TEXT NOT NULL DEFAULT 'pending', amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'gbp', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(provider, provider_reference)
    );
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, payment_transaction_id TEXT, booking_id TEXT,
      provider TEXT NOT NULL, provider_reference TEXT, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'gbp',
      reason TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS business_tax_settings (
      business_id TEXT PRIMARY KEY, tax_name TEXT NOT NULL DEFAULT 'Tax', rate REAL NOT NULL DEFAULT 0,
      inclusive INTEGER NOT NULL DEFAULT 0, updated_at TEXT DEFAULT (datetime('now'))
    );`);
    for (const col of ['payment_type TEXT DEFAULT \'full\'', 'payment_amount REAL', 'tip_amount REAL NOT NULL DEFAULT 0']) addColumn('bookings', col);
    db.exec(`CREATE TABLE IF NOT EXISTS inbox_conversations (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, customer_id TEXT NOT NULL, booking_id TEXT,
      last_message_at TEXT DEFAULT (datetime('now')), last_message_preview TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, customer_id)
    );
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, business_id TEXT NOT NULL, customer_id TEXT NOT NULL,
      booking_id TEXT, direction TEXT NOT NULL, channel TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'message',
      content TEXT NOT NULL, subject TEXT, status TEXT NOT NULL DEFAULT 'queued', provider TEXT,
      provider_reference TEXT, sender_staff_id TEXT, read_at TEXT, created_at TEXT DEFAULT (datetime('now'))
    );`);
    addColumn('staff_members', "inbox_permissions TEXT DEFAULT '[]'");
    console.log('SQLite migrations completed.');
  }
}

runMigrations().catch(err => { console.error('Migration failed:', err); process.exit(1); });
