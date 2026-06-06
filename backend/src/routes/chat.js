const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const { authenticate, attachBusiness } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const { authenticateConsumer, requireVerifiedConsumer } = require('./consumer');

// Admin
router.post('/admin/login', ctrl.adminLogin);
router.get('/admin/rooms', requireAdmin, ctrl.getRooms);
router.post('/admin/rooms', requireAdmin, ctrl.getOrCreateRoom);
router.get('/admin/rooms/:id/messages', requireAdmin, ctrl.getMessages);
router.post('/admin/rooms/:id/messages', requireAdmin, ctrl.sendMessage);
router.get('/admin/users', requireAdmin, ctrl.getAdminUsers);

// Business (Firebase auth)
router.get('/business/rooms', authenticate, attachBusiness, ctrl.getRooms);
router.post('/business/rooms', authenticate, attachBusiness, ctrl.getOrCreateRoom);
router.get('/business/rooms/:id/messages', authenticate, attachBusiness, ctrl.getMessages);
router.post('/business/rooms/:id/messages', authenticate, attachBusiness, ctrl.sendMessage);

// Consumer
router.get('/consumer/rooms', authenticateConsumer, requireVerifiedConsumer, ctrl.getRooms);
router.post('/consumer/rooms', authenticateConsumer, requireVerifiedConsumer, ctrl.getOrCreateRoom);
router.get('/consumer/rooms/:id/messages', authenticateConsumer, requireVerifiedConsumer, ctrl.getMessages);
router.post('/consumer/rooms/:id/messages', authenticateConsumer, requireVerifiedConsumer, ctrl.sendMessage);

module.exports = router;
