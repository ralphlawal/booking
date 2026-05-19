const router = require('express').Router();
const jwt = require('jsonwebtoken');
const ctrl = require('../controllers/chatController');
const { authenticate, attachBusiness } = require('../middleware/auth');
const { authenticateConsumer } = require('./consumer');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

const authenticateAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    if (payload.type !== 'admin') return res.status(401).json({ error: 'Admin access required' });
    req.admin = { role: 'superadmin' };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

// Admin
router.post('/admin/login', ctrl.adminLogin);
router.get('/admin/rooms', authenticateAdmin, ctrl.getRooms);
router.post('/admin/rooms', authenticateAdmin, ctrl.getOrCreateRoom);
router.get('/admin/rooms/:id/messages', authenticateAdmin, ctrl.getMessages);
router.post('/admin/rooms/:id/messages', authenticateAdmin, ctrl.sendMessage);
router.get('/admin/users', authenticateAdmin, ctrl.getAdminUsers);

// Business (Firebase auth)
router.get('/business/rooms', authenticate, attachBusiness, ctrl.getRooms);
router.post('/business/rooms', authenticate, attachBusiness, ctrl.getOrCreateRoom);
router.get('/business/rooms/:id/messages', authenticate, attachBusiness, ctrl.getMessages);
router.post('/business/rooms/:id/messages', authenticate, attachBusiness, ctrl.sendMessage);

// Consumer
router.get('/consumer/rooms', authenticateConsumer, ctrl.getRooms);
router.post('/consumer/rooms', authenticateConsumer, ctrl.getOrCreateRoom);
router.get('/consumer/rooms/:id/messages', authenticateConsumer, ctrl.getMessages);
router.post('/consumer/rooms/:id/messages', authenticateConsumer, ctrl.sendMessage);

module.exports = router;
