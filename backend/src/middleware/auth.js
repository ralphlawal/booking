const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const attachBusiness = async (req, res, next) => {
  const business = await Business.findByUserId(req.user.id);
  if (!business) {
    return res.status(404).json({ error: 'Business profile not found. Complete your setup.' });
  }
  req.business = business;
  next();
};

module.exports = { authenticate, attachBusiness };
