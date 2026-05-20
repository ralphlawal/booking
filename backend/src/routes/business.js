const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/businessController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP or GIF images are allowed'));
  },
});

// Protected (must come before /:slug to avoid route collision)
router.get('/me', authenticate, attachBusiness, ctrl.getMyBusiness);
router.post('/', authenticate, ctrl.createBusiness);
router.put('/me', authenticate, attachBusiness, ctrl.updateBusiness);
router.post('/me/logo', authenticate, attachBusiness, upload.single('logo'), ctrl.uploadLogo);
router.get('/me/qr', authenticate, attachBusiness, ctrl.getQRCode);
router.post('/me/request-verification', authenticate, attachBusiness, ctrl.requestVerification);
router.post('/me/verification-details', authenticate, attachBusiness, ctrl.submitVerificationDetails);
router.put('/me/bank-details', authenticate, attachBusiness, ctrl.saveBankDetails);

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
