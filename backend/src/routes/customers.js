const router = require('express').Router();
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/customersController');

router.use(authenticate, attachBusiness);
router.get('/', ctrl.list);
router.get('/:id/bookings', ctrl.getBookings);

module.exports = router;
