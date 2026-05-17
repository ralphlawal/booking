const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, attachBusiness } = require('../middleware/auth');
const ctrl = require('../controllers/servicesController');

router.use(authenticate, attachBusiness);

router.get('/', ctrl.list);

router.post(
  '/',
  [
    body('name').notEmpty().trim().withMessage('Service name required'),
    body('duration_minutes').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
    body('price').optional().isFloat({ min: 0 }),
  ],
  validate,
  ctrl.create
);

router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
