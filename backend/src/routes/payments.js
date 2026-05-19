const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/paymentsController');

// Stripe webhook needs raw body — mount before json parsing
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

router.post('/create-intent', ctrl.createIntent);
router.get('/booking/:bookingId', ctrl.getForBooking);

module.exports = router;
