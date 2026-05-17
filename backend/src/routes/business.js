const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/businessController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    cb(null, allowed.test(file.originalname));
  },
});

// Protected (must come before /:slug to avoid route collision)
router.get('/me', authenticate, attachBusiness, ctrl.getMyBusiness);
router.post('/', authenticate, ctrl.createBusiness);
router.put('/me', authenticate, attachBusiness, ctrl.updateBusiness);
router.post('/me/logo', authenticate, attachBusiness, upload.single('logo'), ctrl.uploadLogo);
router.get('/me/qr', authenticate, attachBusiness, ctrl.getQRCode);

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
