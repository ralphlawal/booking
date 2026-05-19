const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ConsumerAccount = require('../models/ConsumerAccount');
const Notification = require('../models/Notification');
const { sendEmail, sendVerificationEmail } = require('../services/emailService');

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

    // Link any past guest bookings with matching email
    ConsumerAccount.linkByEmail(consumer.id, email).catch(() => {});

    // Send email verification (fire-and-forget)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    ConsumerAccount.saveVerifyToken(consumer.id, verifyToken).catch(() => {});
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://booking-sepia-nu.vercel.app';
    sendVerificationEmail(consumer, `${FRONTEND_URL}/customer/verify-email?token=${verifyToken}`).catch(() => {});

    // Send welcome email (fire and forget)
    const FRONTEND = process.env.FRONTEND_URL || 'https://booking-sepia-nu.vercel.app';
    sendEmail({
      to: consumer.email,
      subject: 'Welcome to BookAm Business — start booking',
      type: 'consumer_welcome',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#4f46e5,#6d28d9);padding:28px 32px;text-align:center">
          <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779210788/IMG_0364_cgkeo4.png" alt="BookAm Business" style="height:32px;filter:brightness(0) invert(1)" />
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px">Welcome, ${consumer.full_name}! 🎉</h2>
          <p style="color:#64748b;font-size:15px;margin:0 0 20px">Your BookAm Business account is ready. Discover and book local services instantly.</p>
          <a href="${FRONTEND}/explore" style="display:inline-block;background:#5b3eea;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Browse services →</a>
        </div>
      </div>`,
    }).catch(() => {});

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

    // Link any past guest bookings with matching email (fire and forget)
    ConsumerAccount.linkByEmail(safe.id, safe.email).catch(() => {});

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const FRONTEND = process.env.FRONTEND_URL || 'https://booking-sepia-nu.vercel.app';
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const updated = await ConsumerAccount.setResetToken(email, token, expires);
    if (updated) {
      await sendEmail({
        to: email.toLowerCase().trim(),
        subject: 'Reset your BookAm Business password',
        type: 'consumer_password_reset',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
          <div style="background:linear-gradient(135deg,#4f46e5,#6d28d9);padding:28px 32px;text-align:center">
            <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779210788/IMG_0364_cgkeo4.png" alt="BookAm Business" style="height:32px;filter:brightness(0) invert(1)" />
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Reset your password</h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="${FRONTEND}/customer/reset-password?token=${token}" style="display:inline-block;background:#5b3eea;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Reset password →</a>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">If you didn't request this, ignore this email — your password won't change.</p>
          </div>
        </div>`,
      });
    }
    // Always return success to avoid email enumeration
    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    console.error('[consumer/forgotPassword]', err.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const account = await ConsumerAccount.findByResetToken(token);
    if (!account) return res.status(400).json({ error: 'Invalid or expired reset link' });
    const hash = await bcrypt.hash(password, 12);
    await ConsumerAccount.updatePassword(account.id, hash);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[consumer/resetPassword]', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await ConsumerAccount.deleteById(req.consumer.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('[consumer/deleteAccount]', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

exports.changeEmail = async (req, res) => {
  try {
    const { new_email, password } = req.body;
    if (!new_email || !password) return res.status(400).json({ error: 'New email and password required' });
    const account = await ConsumerAccount.findByEmail(req.consumer.email);
    if (!account) return res.status(401).json({ error: 'Account not found' });
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    const existing = await ConsumerAccount.findByEmail(new_email);
    if (existing && existing.id !== req.consumer.id) return res.status(409).json({ error: 'This email is already in use' });
    const updated = await ConsumerAccount.changeEmail(req.consumer.id, new_email);
    res.json(updated);
  } catch (err) {
    console.error('[consumer/changeEmail]', err.message);
    res.status(500).json({ error: 'Failed to change email' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getForConsumer(req.consumer.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.markRead(req.consumer.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const verifyToken = require('crypto').randomBytes(32).toString('hex');
    await ConsumerAccount.saveVerifyToken(req.consumer.id, verifyToken);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://booking-sepia-nu.vercel.app';
    const { sendVerificationEmail } = require('../services/emailService');
    await sendVerificationEmail(req.consumer, `${FRONTEND_URL}/customer/verify-email?token=${verifyToken}`);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('[consumer/resendVerification]', err.message);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const consumer = await ConsumerAccount.findByVerifyToken(token);
    if (!consumer) return res.status(400).json({ error: 'Invalid or expired verification link' });
    await ConsumerAccount.markEmailVerified(consumer.id);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('[consumer/verify-email]', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const account = await ConsumerAccount.findByEmail(req.consumer.email);
    if (!account) return res.status(401).json({ error: 'Account not found' });
    const valid = await bcrypt.compare(current_password, account.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await ConsumerAccount.updatePassword(account.id, hash);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[consumer/changePassword]', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
