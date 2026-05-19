const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = {
  async create({ email, password, full_name }) {
    const password_hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO users (id, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, created_at`,
      [id, email.toLowerCase(), password_hash, full_name]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query(
      'SELECT id, email, full_name, is_verified, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async comparePassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  },

  async findByFirebaseUid(firebase_uid) {
    const { rows } = await db.query('SELECT * FROM users WHERE firebase_uid = $1', [firebase_uid]);
    return rows[0] || null;
  },

  async createFromFirebase({ firebase_uid, email, full_name }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, firebase_uid)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, firebase_uid, created_at`,
      [id, email.toLowerCase(), 'firebase_auth', full_name, firebase_uid]
    );
    return rows[0];
  },

  async linkFirebaseUid(id, firebase_uid) {
    await db.query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [firebase_uid, id]);
  },

  async saveResetToken(id, token, expiresAt) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [hash, expiresAt.toISOString(), id]
    );
  },

  async findByResetToken(token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await db.query(
      'SELECT * FROM users WHERE reset_token = $1',
      [hash]
    );
    return rows[0] || null;
  },

  async updatePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [password_hash, id]
    );
  },

  async saveVerifyToken(id, token) {
    await db.query(
      'UPDATE users SET email_verified = FALSE, email_verify_token = $1 WHERE id = $2',
      [token, id]
    );
  },

  async findByVerifyToken(token) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email_verify_token = $1',
      [token]
    );
    return rows[0] || null;
  },

  async markEmailVerified(id) {
    await db.query(
      'UPDATE users SET email_verified = TRUE, email_verify_token = NULL WHERE id = $1',
      [id]
    );
  },
};

module.exports = User;
