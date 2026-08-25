const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/businessController');
const connectCtrl = require('../controllers/stripeConnectController');
const { createImageUpload } = require('../middleware/upload');

const logoUpload = createImageUpload({ fieldName: 'logo', fileSize: 6 * 1024 * 1024, label: 'Logo' });

// Protected (must come before /:slug to avoid route collision)
router.get('/me', authenticate, attachBusiness, ctrl.getMyBusiness);
router.post('/', authenticate, ctrl.createBusiness);
router.put('/me', authenticate, attachBusiness, ctrl.updateBusiness);
router.post('/me/logo', authenticate, attachBusiness, logoUpload, ctrl.uploadLogo);
router.get('/me/qr', authenticate, attachBusiness, ctrl.getQRCode);
router.post('/me/request-verification', authenticate, attachBusiness, ctrl.requestVerification);
router.post('/me/verification-details', authenticate, attachBusiness, ctrl.submitVerificationDetails);
router.put('/me/bank-details', authenticate, attachBusiness, ctrl.saveBankDetails);

// Stripe Connect — payout onboarding & dashboard
router.post('/me/stripe-connect/onboard', authenticate, attachBusiness, connectCtrl.onboard);
router.get('/me/stripe-connect/status', authenticate, attachBusiness, connectCtrl.status);
router.post('/me/stripe-connect/dashboard', authenticate, attachBusiness, connectCtrl.dashboard);

// Public
router.get('/:slug', ctrl.getPublicBusiness);
router.get('/:slug/check', ctrl.checkSlug);
router.get('/:slug/services', async (req, res) => {
  const Business = require('../models/Business');
  const Service = require('../models/Service');
  const biz = await Business.findBySlug(req.params.slug);
  if (!biz) return res.status(404).json({ error: 'Not found' });
  const services = await Service.findByBusinessId(biz.id, true);
  res.json(services);
});

module.exports = router;
