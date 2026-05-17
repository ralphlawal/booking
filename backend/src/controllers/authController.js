const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Business = require('../models/Business');
const { sendEmail } = require('../services/emailService');

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await User.saveResetToken(user.id, token, expires);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your Bookly password',
      type: 'password_reset',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;width:48px;height:48px;background:#4f46e5;border-radius:12px;line-height:48px;text-align:center">
              <span style="color:white;font-size:20px">📅</span>
            </div>
            <h1 style="color:#111827;margin:12px 0 4px;font-size:22px">Reset your password</h1>
            <p style="color:#6b7280;font-size:14px;margin:0">Hi ${user.full_name}, click below to set a new password.</p>
          </div>
          <a href="${resetUrl}" style="display:block;text-align:center;background:#4f46e5;color:white;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin:24px 0">
            Reset Password
          </a>
          <p style="color:#9ca3af;font-size:12px;text-align:center">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>`,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: 'Token and password (min 6 chars) required' });
    }

    const user = await User.findByResetToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    const expired = new Date(user.reset_token_expires) < new Date();
    if (expired) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

    await User.updatePassword(user.id, password);
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
