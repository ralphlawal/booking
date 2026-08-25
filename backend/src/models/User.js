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
      'SELECT id, email, full_name, is_verified, COALESCE(email_verified, TRUE) AS email_verified, created_at FROM users WHERE id = $1',
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

  async findByPhone(phone) {
    const { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return rows[0] || null;
  },

  async createFromPhone({ phone, full_name }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO users (id, phone, password_hash, full_name, phone_verified)
       VALUES ($1, $2, 'phone_auth', $3, TRUE)
       RETURNING id, phone, full_name, created_at`,
      [id, phone, full_name || 'User']
    );
    return rows[0];
  },

  async savePhoneOtp(id, otp, expiresAt) {
    await db.query(
      'UPDATE users SET phone_otp = $1, phone_otp_expires = $2 WHERE id = $3',
      [otp, expiresAt.toISOString(), id]
    );
  },

  async clearPhoneOtp(id) {
    await db.query(
      'UPDATE users SET phone_otp = NULL, phone_otp_expires = NULL, phone_verified = TRUE WHERE id = $1',
      [id]
    );
  },

  async updateFullName(id, full_name) {
    await db.query('UPDATE users SET full_name = $1 WHERE id = $2', [full_name, id]);
  },

  async changePassword(id, currentPassword, newPassword) {
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    if (!rows.length) throw new Error('User not found');
    if (rows[0].password_hash !== 'phone_auth' && rows[0].password_hash !== 'firebase_auth') {
      const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!valid) throw Object.assign(new Error('Current password is incorrect'), { code: 'WRONG_PASSWORD' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
  },
};

module.exports = User;
