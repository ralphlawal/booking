const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/bookingsController');
const Business = require('../models/Business');

// Attach business by slug for public booking creation
const attachBySlug = async (req, res, next) => {
  const business = await Business.findBySlug(req.params.slug);
  if (!business) return res.status(404).json({ error: 'Business not found' });
  req.business = business;
  next();
};

// Public: create booking
router.post(
  '/public/:slug',
  attachBySlug,
  [
    body('service_id').isUUID().withMessage('Valid service ID required'),
    body('booking_date').isDate().withMessage('Valid date required'),
    body('start_time').matches(/^\d{2}:\d{2}$/).withMessage('Valid start time required'),
    body('customer_name').notEmpty().trim().withMessage('Name required'),
    body('customer_phone').notEmpty().trim().withMessage('Phone required'),
    body('customer_email').optional().isEmail(),
  ],
  validate,
  ctrl.create
);

// Public: get booking by reference
router.get('/ref/:ref', ctrl.getByReference);

// Public: customer cancels their own booking
router.post('/ref/:ref/cancel', ctrl.cancelByCustomer);

// Admin routes
router.get('/', authenticate, attachBusiness, ctrl.list);
router.get('/:id', authenticate, attachBusiness, ctrl.getById);
router.put('/:id/status', authenticate, attachBusiness, ctrl.updateStatus);
router.put('/:id/reschedule', authenticate, attachBusiness, ctrl.reschedule);

module.exports = router;
