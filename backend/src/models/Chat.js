const db = require('../config/database');
const crypto = require('crypto');

const Chat = {
  async findOrCreateRoom({ type, business_id, consumer_id, subject }) {
    let existing;
    if (type === 'business_customer') {
      const { rows } = await db.query(
        'SELECT * FROM chat_rooms WHERE type=$1 AND business_id=$2 AND consumer_id=$3',
        [type, business_id, consumer_id]
      );
      existing = rows[0];
    } else if (type === 'admin_business') {
      const { rows } = await db.query(
        'SELECT * FROM chat_rooms WHERE type=$1 AND business_id=$2 AND consumer_id IS NULL',
        [type, business_id]
      );
      existing = rows[0];
    } else if (type === 'admin_consumer') {
      const { rows } = await db.query(
        'SELECT * FROM chat_rooms WHERE type=$1 AND consumer_id=$2 AND business_id IS NULL',
        [type, consumer_id]
      );
      existing = rows[0];
    }
    if (existing) return existing;

    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO chat_rooms (id, type, business_id, consumer_id, subject, status, last_message_at, created_at)
       VALUES ($1,$2,$3,$4,$5,'open',NOW(),NOW()) RETURNING *`,
      [id, type, business_id || null, consumer_id || null, subject || null]
    );
    return rows[0];
  },

  async getRoom(id) {
    const { rows } = await db.query('SELECT * FROM chat_rooms WHERE id=$1', [id]);
    return rows[0];
  },

  async getRoomsForBusiness(business_id) {
    const { rows } = await db.query(
      `SELECT r.*,
         b.name AS business_name,
         c.full_name AS consumer_name, c.email AS consumer_email,
         m.content AS last_message
       FROM chat_rooms r
       LEFT JOIN businesses b ON b.id = r.business_id
       LEFT JOIN consumer_accounts c ON c.id = r.consumer_id
       LEFT JOIN LATERAL (
         SELECT content FROM chat_messages WHERE room_id=r.id ORDER BY created_at DESC LIMIT 1
       ) m ON true
       WHERE r.business_id=$1
       ORDER BY r.last_message_at DESC`,
      [business_id]
    );
    return rows;
  },

  async getRoomsForConsumer(consumer_id) {
    const { rows } = await db.query(
      `SELECT r.*,
         b.name AS business_name, b.slug AS business_slug,
         m.content AS last_message
       FROM chat_rooms r
       LEFT JOIN businesses b ON b.id = r.business_id
       LEFT JOIN LATERAL (
         SELECT content FROM chat_messages WHERE room_id=r.id ORDER BY created_at DESC LIMIT 1
       ) m ON true
       WHERE r.consumer_id=$1
       ORDER BY r.last_message_at DESC`,
      [consumer_id]
    );
    return rows;
  },

  async getAllRooms() {
    const { rows } = await db.query(
      `SELECT r.*,
         b.name AS business_name,
         c.full_name AS consumer_name, c.email AS consumer_email,
         m.content AS last_message
       FROM chat_rooms r
       LEFT JOIN businesses b ON b.id = r.business_id
       LEFT JOIN consumer_accounts c ON c.id = r.consumer_id
       LEFT JOIN LATERAL (
         SELECT content FROM chat_messages WHERE room_id=r.id ORDER BY created_at DESC LIMIT 1
       ) m ON true
       ORDER BY r.last_message_at DESC`
    );
    return rows;
  },

  async getMessages(room_id, since) {
    let q = 'SELECT * FROM chat_messages WHERE room_id=$1';
    const params = [room_id];
    if (since) { q += ' AND created_at > $2'; params.push(since); }
    q += ' ORDER BY created_at ASC';
    if (!since) q += ' LIMIT 100';
    const { rows } = await db.query(q, params);
    return rows;
  },

  async addMessage({ room_id, sender_type, sender_name, content }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO chat_messages (id, room_id, sender_type, sender_name, content, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [id, room_id, sender_type, sender_name, content]
    );
    await db.query('UPDATE chat_rooms SET last_message_at=NOW() WHERE id=$1', [room_id]);
    return rows[0];
  },
};

module.exports = Chat;
