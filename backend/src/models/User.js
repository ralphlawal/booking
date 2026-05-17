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
};

module.exports = User;
