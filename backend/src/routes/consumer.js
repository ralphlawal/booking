const router = require('express').Router();
const jwt = require('jsonwebtoken');
const ConsumerAccount = require('../models/ConsumerAccount');
const ctrl = require('../controllers/consumerController');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

const authenticateConsumer = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    if (payload.type !== 'consumer') return res.status(401).json({ error: 'Invalid token type' });
    const consumer = await ConsumerAccount.findById(payload.consumerId);
    if (!consumer) return res.status(401).json({ error: 'Account not found' });
    req.consumer = consumer;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/me', authenticateConsumer, ctrl.me);
router.put('/me', authenticateConsumer, ctrl.update);
router.post('/change-password', authenticateConsumer, ctrl.changePassword);
router.get('/bookings', authenticateConsumer, ctrl.myBookings);
router.get('/preferences', authenticateConsumer, ctrl.getPreferences);
router.post('/preferences', authenticateConsumer, ctrl.upsertPreference);
router.delete('/preferences/:businessId', authenticateConsumer, ctrl.removePreference);

module.exports = router;
module.exports.authenticateConsumer = authenticateConsumer;
