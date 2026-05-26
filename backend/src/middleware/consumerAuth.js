const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

const consumerAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    if (payload.type !== 'consumer') {
      return res.status(401).json({ error: 'Consumer account required' });
    }
    req.consumerId = payload.consumerId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

module.exports = { consumerAuth };
