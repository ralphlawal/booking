const db = require('../config/database');
const crypto = require('crypto');

const Notification = {
  async create({ consumer_id, type, title, body, link }) {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO notifications (id, consumer_id, type, title, body, link)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, consumer_id, type, title, body || null, link || null]
    );
  },

  async createForAllConsumers({ type, title, body, link }) {
    const { rowCount } = await db.query(
      `INSERT INTO notifications (id, consumer_id, type, title, body, link)
       SELECT uuid_generate_v4(), id, $1, $2, $3, $4
       FROM consumer_accounts`,
      [type, title, body || null, link || null]
    );
    return rowCount || 0;
  },

  async getForConsumer(consumer_id) {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE consumer_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [consumer_id]
    );
    return rows;
  },

  async markRead(consumer_id) {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE consumer_id = $1 AND is_read = FALSE`,
      [consumer_id]
    );
  },
};

module.exports = Notification;
