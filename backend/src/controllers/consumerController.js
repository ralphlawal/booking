const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ConsumerAccount = require('../models/ConsumerAccount');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

const signToken = (consumer) =>
  jwt.sign(
    { consumerId: consumer.id, type: 'consumer' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name)
      return res.status(400).json({ error: 'email, password and name are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await ConsumerAccount.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const consumer = await ConsumerAccount.create({ email, password, full_name, phone });
    const token = signToken(consumer);
    res.status(201).json({ consumer, token });
  } catch (err) {
    console.error('[consumer/register]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const consumer = await ConsumerAccount.findByEmail(email);
    if (!consumer) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, consumer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { password_hash, ...safe } = consumer;
    const token = signToken(safe);
    res.json({ consumer: safe, token });
  } catch (err) {
    console.error('[consumer/login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.me = (req, res) => res.json(req.consumer);

exports.update = async (req, res) => {
  try {
    const updated = await ConsumerAccount.update(req.consumer.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('[consumer/update]', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.myBookings = async (req, res) => {
  try {
    const bookings = await ConsumerAccount.getBookings(req.consumer.id);
    res.json(bookings);
  } catch (err) {
    console.error('[consumer/bookings]', err.message);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const prefs = await ConsumerAccount.getPreferences(req.consumer.id);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load preferences' });
  }
};

exports.upsertPreference = async (req, res) => {
  try {
    const { business_id, service_id, notes } = req.body;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });
    const pref = await ConsumerAccount.upsertPreference({
      consumer_id: req.consumer.id, business_id, service_id, notes,
    });
    res.json(pref);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save preference' });
  }
};

exports.removePreference = async (req, res) => {
  try {
    await ConsumerAccount.removePreference(req.consumer.id, req.params.businessId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove preference' });
  }
};
