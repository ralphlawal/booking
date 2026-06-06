const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function getAdminPayload(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    return payload.type === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

function isAdmin(req) {
  return !!getAdminPayload(req);
}

function requireAdmin(req, res, next) {
  const payload = getAdminPayload(req);
  if (!payload) return res.status(403).json({ error: 'Forbidden' });
  req.admin = { role: payload.role || 'superadmin' };
  return next();
}

module.exports = { getAdminPayload, isAdmin, requireAdmin };
