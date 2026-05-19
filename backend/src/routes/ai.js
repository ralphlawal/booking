const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/aiController');

const aiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests — please slow down' },
});

router.post('/chat', aiLimit, ctrl.chat);

module.exports = router;
