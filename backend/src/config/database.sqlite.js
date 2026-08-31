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
  const bindValue = (value) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  };
  const sql = text
    .replace(/\$(\d+)(::[a-zA-Z_][\w]*(?:\[\])?)?/g, (_, n) => {
      boundValues.push(bindValue(params[parseInt(n, 10) - 1]));
      return '?';
    })
    .replace(/'([^']*)'::jsonb/g, "'$1'")
    // Strip Postgres casts, including parameterised types: ::numeric(10,2), ::varchar(255), ::int[]
    .replace(/::[a-zA-Z_][\w]*(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?(?:\[\])?/g, '')
    .replace(/\bILIKE\b/gi, 'LIKE')
    // Postgres JSON helpers → their SQLite JSON1 equivalents (columns are
    // stored as JSON text in the SQLite schema).
    .replace(/\bjsonb?_array_length\b/gi, 'json_array_length')
    .replace(/\bjsonb?_build_object\b/gi, 'json_object')
    .replace(/\bjsonb?_agg\b/gi, 'json_group_array')
    .replace(/\bjsonb_array_elements_text\b/gi, 'json_each')
    // Postgres date arithmetic → SQLite datetime()/date() modifiers.
    .replace(
      /\b(NOW\(\)|CURRENT_TIMESTAMP|CURRENT_DATE)\s*([-+])\s*INTERVAL\s*'\s*(\d+)\s+([a-z]+?)s?\s*'/gi,
      (_, base, sign, n, unit) =>
        `${/DATE/i.test(base) ? 'date' : 'datetime'}('now', '${sign}${n} ${unit.toLowerCase()}s')`
    );

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
