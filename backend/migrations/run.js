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
      const sql = fs.readFileSync(path.join(__dirname, '001_initial_schema.sql'), 'utf8');
      await client.query(sql);
      console.log('PostgreSQL migrations completed.');
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
    console.log('SQLite migrations completed.');
  }
}

runMigrations().catch(err => { console.error('Migration failed:', err); process.exit(1); });
