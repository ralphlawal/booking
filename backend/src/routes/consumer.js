const router = require('express').Router();
const jwt = require('jsonwebtoken');
const ConsumerAccount = require('../models/ConsumerAccount');
const ctrl = require('../controllers/consumerController');
const { createImageUpload } = require('../middleware/upload');

const avatarUpload = createImageUpload({ fieldName: 'avatar', fileSize: 6 * 1024 * 1024, label: 'Profile picture' });

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

const requireVerifiedConsumer = (req, res, next) => {
  if (req.consumer?.email_verified === false) {
    return res.status(403).json({
      error: 'Please verify your email address before using this feature.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/google-auth', ctrl.googleAuth);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/me', authenticateConsumer, ctrl.me);
router.put('/me', authenticateConsumer, ctrl.update);
router.post('/change-email', authenticateConsumer, ctrl.changeEmail);
router.post('/change-password', authenticateConsumer, ctrl.changePassword);
router.get('/bookings', authenticateConsumer, requireVerifiedConsumer, ctrl.myBookings);
router.get('/preferences', authenticateConsumer, requireVerifiedConsumer, ctrl.getPreferences);
router.post('/preferences', authenticateConsumer, requireVerifiedConsumer, ctrl.upsertPreference);
router.delete('/preferences/:businessId', authenticateConsumer, requireVerifiedConsumer, ctrl.removePreference);
router.delete('/account', authenticateConsumer, ctrl.deleteAccount);
router.get('/notifications', authenticateConsumer, ctrl.getNotifications);
router.post('/notifications/read', authenticateConsumer, ctrl.markNotificationsRead);
router.post('/resend-verification', authenticateConsumer, ctrl.resendVerification);
router.get('/verify-email', ctrl.verifyEmail);
router.get('/referral', authenticateConsumer, ctrl.getReferral);
router.get('/loyalty', authenticateConsumer, requireVerifiedConsumer, ctrl.getLoyalty);
router.get('/family-members', authenticateConsumer, ctrl.getFamilyMembers);
router.post('/family-members', authenticateConsumer, ctrl.addFamilyMember);
router.put('/family-members/:id', authenticateConsumer, ctrl.updateFamilyMember);
router.delete('/family-members/:id', authenticateConsumer, ctrl.deleteFamilyMember);
router.post('/me/avatar', authenticateConsumer, avatarUpload, ctrl.uploadAvatar);

module.exports = router;
module.exports.authenticateConsumer = authenticateConsumer;
module.exports.requireVerifiedConsumer = requireVerifiedConsumer;
