const db = require('../config/database');
const crypto = require('crypto');

const BusinessNotification = {
  async create({ business_id, type, title, body, link }) {
    await db.query(
      `INSERT INTO business_notifications (id, business_id, type, title, body, link)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [crypto.randomUUID(), business_id, type, title, body || null, link || null]
    ).catch(() => {}); // never block the caller if table doesn't exist yet
  },

  async getForBusiness(business_id, limit = 30) {
    const { rows } = await db.query(
      `SELECT * FROM business_notifications WHERE business_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [business_id, limit]
    );
    return rows;
  },

  async unreadCount(business_id) {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS cnt FROM business_notifications WHERE business_id=$1 AND is_read=FALSE`,
      [business_id]
    );
    return parseInt(rows[0]?.cnt || 0, 10);
  },

  async markRead(business_id) {
    await db.query(
      `UPDATE business_notifications SET is_read=TRUE WHERE business_id=$1 AND is_read=FALSE`,
      [business_id]
    );
  },
};

module.exports = BusinessNotification;
