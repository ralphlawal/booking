const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, full_name });
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await User.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const business = await Business.findByUserId(user.id);
    const token = signToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      business: business || null,
      onboardingComplete: !!business,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  const business = await Business.findByUserId(req.user.id);
  res.json({
    user: req.user,
    business: business || null,
    onboardingComplete: !!business,
  });
};
