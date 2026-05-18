const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('full_name').notEmpty().trim().withMessage('Full name required'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.me);

// Firebase sync — called after Firebase sign-in to create/link user in our DB
router.post('/firebase-sync', ctrl.firebaseSync);

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  ctrl.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  ctrl.resetPassword
);

router.delete('/account', authenticate, ctrl.deleteAccount);

module.exports = router;
