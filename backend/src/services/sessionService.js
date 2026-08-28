const crypto = require('crypto');
const db = require('../config/database');

// Access tokens are deliberately short-lived credentials. A refresh token is
// a separate, opaque credential that is stored hashed in the database and is
// rotated every time it is used. This lets an installed app survive an expired
// access token without storing a long-lived JWT on the device.
const REFRESH_TTL_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS || 180));

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userType, userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO auth_refresh_tokens (id, user_type, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userType, userId, hashToken(token), expiresAt]
  );
  return token;
}

async function rotateRefreshToken(token, expectedUserType) {
  if (!token || typeof token !== 'string') return null;
  const { rows } = await db.query(
    `SELECT id, user_id, user_type, expires_at, revoked_at
       FROM auth_refresh_tokens
      WHERE token_hash = $1 AND user_type = $2
      LIMIT 1`,
    [hashToken(token), expectedUserType]
  );
  const session = rows[0];
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;

  // Conditional revoke prevents a token replay from producing another valid
  // refresh session if two requests race each other.
  const revoked = await db.query(
    `UPDATE auth_refresh_tokens
        SET revoked_at = NOW()
      WHERE id = $1 AND revoked_at IS NULL`,
    [session.id]
  );
  if (!revoked.rowCount) return null;

  return {
    userId: session.user_id,
    refreshToken: await issueRefreshToken(expectedUserType, session.user_id),
  };
}

async function revokeRefreshToken(token, expectedUserType) {
  if (!token || typeof token !== 'string') return;
  await db.query(
    `UPDATE auth_refresh_tokens SET revoked_at = NOW()
      WHERE token_hash = $1 AND user_type = $2 AND revoked_at IS NULL`,
    [hashToken(token), expectedUserType]
  );
}

async function revokeAllUserSessions(userType, userId) {
  await db.query(
    `UPDATE auth_refresh_tokens SET revoked_at = NOW()
      WHERE user_type = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [userType, userId]
  );
}

module.exports = { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserSessions };
