const db = require('../config/database');
const crypto = require('crypto');

async function sendWebPush(consumer_id, payload) {
  try {
    const webpush = require('web-push');
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return;
    webpush.setVapidDetails(`mailto:${process.env.ADMIN_EMAIL || 'hello@bookam.business'}`, pub, priv);
    const { rows } = await db.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE consumer_id=$1', [consumer_id]);
    for (const sub of rows) {
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload))
        .catch(() => {});
    }
  } catch {}
}

const Notification = {
  async create({ consumer_id, type, title, body, link }) {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO notifications (id, consumer_id, type, title, body, link)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, consumer_id, type, title, body || null, link || null]
    );
    sendWebPush(consumer_id, { title, body, url: link || '/' }).catch(() => {});
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
