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
      business_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'photo',
      caption TEXT,
      image_url TEXT,
      cta_label TEXT,
      cta_service_id INTEGER,
      offer_text TEXT,
      offer_expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      booking_clicks INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    console.log('SQLite migrations completed.');
  }
}

runMigrations().catch(err => { console.error('Migration failed:', err); process.exit(1); });
