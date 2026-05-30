const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function getAdminPayload(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(h.split(' ')[1], JWT_SECRET);
    return payload.type === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

async function logAdminAction(req, { action, target_type, target_id, details = {} }) {
  const admin = getAdminPayload(req);
  await db.query(
    `INSERT INTO admin_audit_logs
       (id, admin_role, action, target_type, target_id, details, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      crypto.randomUUID(),
      admin?.role || 'admin',
      action,
      target_type || null,
      target_id || null,
      JSON.stringify(details || {}),
      req.ip || req.headers['x-forwarded-for'] || null,
      req.headers['user-agent'] || null,
    ]
  ).catch(err => console.error('[admin-audit]', err.message));
}

module.exports = {
  getAdminPayload,
  logAdminAction,
};
