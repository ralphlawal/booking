const router = require('express').Router();
const ctrl = require('../controllers/discoverController');

router.get('/', ctrl.search);
router.get('/categories', ctrl.categories);
router.get('/match', ctrl.smartMatch);

module.exports = router;
