const router = require('express').Router();
const ctrl = require('../controllers/reviewsController');
const { authenticateConsumer } = require('./consumer');

router.get('/check/:bookingId', authenticateConsumer, ctrl.checkReviewable);
router.get('/:slug', ctrl.getForBusiness);
router.post('/', authenticateConsumer, ctrl.create);

module.exports = router;
