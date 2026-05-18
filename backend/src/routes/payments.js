const router = require('express').Router();
const ctrl = require('../controllers/paymentsController');
const { authenticate, attachBusiness } = require('../middleware/auth');

router.post('/mandate', ctrl.createMandate);
router.get('/mandate/:bookingId', ctrl.getMandateForBooking);
router.post('/charge/:mandateId', authenticate, attachBusiness, ctrl.chargeNoShow);
router.post('/webhook', ctrl.webhook);

module.exports = router;
