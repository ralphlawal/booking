const router = require('express').Router();
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/availabilityController');
const Business = require('../models/Business');

// Middleware to attach business by slug (for public routes)
const attachBySlug = async (req, res, next) => {
  const business = await Business.findBySlug(req.params.slug);
  if (!business) return res.status(404).json({ error: 'Business not found' });
  req.business = business;
  next();
};

// Public: get available slots
router.get('/public/:slug/slots', attachBySlug, ctrl.getSlots);

// Admin: availability settings
router.get('/', authenticate, attachBusiness, ctrl.get);
router.post('/', authenticate, attachBusiness, ctrl.upsert);

// Admin: blocked slots
router.get('/blocked', authenticate, attachBusiness, ctrl.getBlockedSlots);
router.post('/blocked', authenticate, attachBusiness, ctrl.addBlockedSlot);
router.delete('/blocked/:id', authenticate, attachBusiness, ctrl.removeBlockedSlot);

module.exports = router;
