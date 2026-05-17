/**
 * Dual database adapter.
 * - LOCAL:      DATABASE_URL absent → SQLite via better-sqlite3 (zero install)
 * - PRODUCTION: DATABASE_URL present → PostgreSQL via pg
 *
 * Both expose the same async query({ rows }) interface so all models
 * work unchanged in either environment.
 */

if (process.env.DATABASE_URL) {
  module.exports = require('./database.pg');
} else {
  module.exports = require('./database.sqlite');
}
