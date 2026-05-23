const BetterSQLite3 = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../bookly.db');
const db = new BetterSQLite3(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.function('uuid_generate_v4', () => crypto.randomUUID());
db.function('NOW', () => new Date().toISOString());

/**
 * PostgreSQL $N params → SQLite ?, scanning left-to-right so out-of-order
 * references (e.g. $4 before $3) are bound correctly.
 */
const query = async (text, params = []) => {
  const boundValues = [];
  const sql = text
    .replace(/\$(\d+)(::[a-zA-Z_][\w]*(?:\[\])?)?/g, (_, n) => {
      boundValues.push(params[parseInt(n, 10) - 1]);
      return '?';
    })
    .replace(/'([^']*)'::jsonb/g, "'$1'")
    .replace(/::[a-zA-Z_][\w]*(?:\[\])?/g, '')
    .replace(/\bILIKE\b/gi, 'LIKE');

  const stmt = db.prepare(sql);
  const upper = sql.trimStart().toUpperCase();
  const isRead = upper.startsWith('SELECT') || upper.startsWith('WITH');
  const hasReturning = /\bRETURNING\b/i.test(sql);

  if (isRead || hasReturning) {
    const rows = stmt.all(...boundValues);
    return { rows };
  }

  const info = stmt.run(...boundValues);
  return { rows: [], rowCount: info.changes };
};

module.exports = { query, db };
