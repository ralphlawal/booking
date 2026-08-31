const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Business = require('../models/Business');
const { sendEmail, sendWelcomeEmail, sendRalphWelcomeEmail, sendVerificationEmail, sendEmailOtpCode } = require('../services/emailService');

const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);
const { sendSms } = require('../services/smsService');
const db = require('../config/database');
const { issueRefreshToken, rotateRefreshToken, revokeAllUserSessions } = require('../services/sessionService');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({ email, password, full_name });

    // Send a verification code — the account isn't "fully open" until it's entered.
    const otp = genOtp();
    await User.saveEmailOtp(user.id, otp, otpExpiry()).catch((e) => console.error('saveEmailOtp:', e.message));
    sendEmailOtpCode(user, otp, 'verify').catch(() => {});

    // Notify admin of new signup
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ralphlawal2003@gmail.com';
    sendEmail({
      to: ADMIN_EMAIL,
      subject: `New business signup: ${full_name}`,
      type: 'admin_notification',
      html: `<div style="font-family:sans-serif;max-width:480px;padding:24px">
        <h3 style="margin:0 0 8px;color:#1e293b">New business owner registered</h3>
        <p style="color:#64748b;margin:0 0 4px"><strong>Name:</strong> ${full_name}</p>
        <p style="color:#64748b;margin:0 0 4px"><strong>Email:</strong> ${email}</p>
        ${phone ? `<p style="color:#64748b;margin:0 0 4px"><strong>Phone:</strong> ${phone}</p>` : ''}
        <p style="color:#64748b;margin:0"><strong>Time:</strong> ${new Date().toUTCString()}</p>
      </div>`,
    }).catch(() => {});

    // No session until the email is verified via the OTP.
    res.status(201).json({
      needsVerification: true,
      email: user.email,
      user: { id: user.id, email: user.email, full_name: user.full_name, email_verified: false },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findByEmail(email);
    if (!user) return res.json({ message: 'If that email is registered, a code has been sent.' });
    if (user.email_verified) return res.json({ message: 'Already verified' });
    const otp = genOtp();
    await User.saveEmailOtp(user.id, otp, otpExpiry());
    sendEmailOtpCode(user, otp, 'verify').catch(() => {});
    res.json({ message: 'A new code has been sent.' });
  } catch (err) {
    console.error('Resend email OTP error:', err);
    res.status(500).json({ error: 'Failed to send code' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.password_hash === 'firebase_auth' || user.password_hash === 'phone_auth') {
      return res.status(401).json({
        error: 'This account has no password set. Use the "Email code" tab to sign in instead.',
        hint: 'use_otp',
      });
    }

    const valid = await User.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const business = await Business.findByUserId(user.id);
    const token = signToken(user.id);
    const refreshToken = await issueRefreshToken('business', user.id);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, email_verified: !!user.email_verified },
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
    // email_verified is a real boolean on Postgres but 0/1 on SQLite — normalise
    // so the client can rely on a strict `=== true` / `!== true` check.
    user: { ...req.user, email_verified: !!req.user.email_verified, is_verified: !!req.user.is_verified },
    business: business || null,
    onboardingComplete: !!business,
  });
};

exports.refresh = async (req, res) => {
  try {
    const session = await rotateRefreshToken(req.body?.refreshToken, 'business');
    if (!session) return res.status(401).json({ error: 'Your sign-in session has ended. Please sign in again.' });
    const user = await User.findById(session.userId);
    if (!user) return res.status(401).json({ error: 'Your account is no longer available.' });
    const business = await Business.findByUserId(user.id);
    res.json({
      token: signToken(user.id),
      refreshToken: session.refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, email_verified: !!user.email_verified },
      business: business || null,
      onboardingComplete: !!business,
    });
  } catch (err) {
    console.error('Session refresh error:', err.message);
    res.status(500).json({ error: 'Unable to restore your session. Please try again.' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const user = await User.findByVerifyToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
    await User.markEmailVerified(user.id);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('[verify-email]', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const user = req.user;
    if (user.email_verified) return res.json({ message: 'Already verified' });
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await User.saveVerifyToken(user.id, verifyToken);
    const frontendUrl = process.env.FRONTEND_URL || 'https://bookam.business';
    await sendVerificationEmail(user, `${frontendUrl}/verify-email?token=${verifyToken}`);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend' });
  }
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

    const frontendUrl = process.env.FRONTEND_URL || 'https://bookam.business';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your BookAm Business password',
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

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    await revokeAllUserSessions('business', userId);

    if (process.env.DATABASE_URL) {
      const { pool } = require('../config/database.pg');
      const { rows: bizRows } = await pool.query('SELECT id FROM businesses WHERE user_id = $1', [userId]);
      for (const biz of bizRows) {
        await pool.query('DELETE FROM bookings WHERE business_id = $1', [biz.id]);
        await pool.query('DELETE FROM blocked_slots WHERE business_id = $1', [biz.id]);
        await pool.query('DELETE FROM availability_settings WHERE business_id = $1', [biz.id]);
        await pool.query('DELETE FROM services WHERE business_id = $1', [biz.id]);
      }
      await pool.query('DELETE FROM businesses WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } else {
      const { db } = require('../config/database.sqlite');
      const bizRows = db.prepare('SELECT id FROM businesses WHERE user_id = ?').all(userId);
      for (const biz of bizRows) {
        db.prepare('DELETE FROM bookings WHERE business_id = ?').run(biz.id);
        try { db.prepare('DELETE FROM blocked_slots WHERE business_id = ?').run(biz.id); } catch {}
        db.prepare('DELETE FROM availability_settings WHERE business_id = ?').run(biz.id);
        db.prepare('DELETE FROM services WHERE business_id = ?').run(biz.id);
      }
      db.prepare('DELETE FROM businesses WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and code required' });

    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid code' });
    if (user.email_otp !== otp) return res.status(400).json({ error: 'Incorrect code — check your email and try again' });
    if (new Date(user.email_otp_expires) < new Date()) {
      return res.status(400).json({ error: 'Code expired — request a new one' });
    }

    await User.clearEmailOtp(user.id);

    // Account is now fully open — send the founder's welcome note.
    sendRalphWelcomeEmail(user, 'business').catch(() => {});

    const business = await Business.findByUserId(user.id);
    const token = signToken(user.id);
    const refreshToken = await issueRefreshToken('business', user.id);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, email_verified: true },
      business: business || null,
      onboardingComplete: !!business,
    });
  } catch (err) {
    console.error('Verify email OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.sendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email is registered, a code has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.saveEmailOtp(user.id, otp, expires);
    sendEmailOtpCode(user, otp, 'login').catch(() => {});

    res.json({ message: 'If that email is registered, a code has been sent.' });
  } catch (err) {
    console.error('Send login OTP error:', err);
    res.status(500).json({ error: 'Failed to send code' });
  }
};

exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findByPhone(phone);
    if (!user) {
      user = await User.createFromPhone({ phone });
    }

    await User.savePhoneOtp(user.id, otp, expires);
    await sendSms(phone, `Your BookAm verification code is: ${otp}. Valid for 10 minutes.`);

    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp, full_name } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const user = await User.findByPhone(phone);
    if (!user || user.phone_otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date(user.phone_otp_expires) < new Date()) {
      return res.status(400).json({ error: 'OTP expired — request a new one' });
    }

    if (full_name && (user.full_name === 'User' || !user.full_name)) {
      await User.updateFullName(user.id, full_name);
      user.full_name = full_name;
    }

    await User.clearPhoneOtp(user.id);

    if (user.full_name === 'User' && !full_name) {
      const business = await Business.findByUserId(user.id);
      const token = signToken(user.id);
      const refreshToken = await issueRefreshToken('business', user.id);
      return res.json({
        token,
        refreshToken,
        user: { id: user.id, phone: user.phone, full_name: user.full_name },
        business: business || null,
        onboardingComplete: !!business,
        needsName: true,
      });
    }

    const business = await Business.findByUserId(user.id);
    const token = signToken(user.id);
    const refreshToken = await issueRefreshToken('business', user.id);

    if (!user.full_name || user.full_name === 'User') {
      sendWelcomeEmail({ email: null, full_name: 'new user' }).catch(() => {});
    } else if (!business) {
      sendWelcomeEmail(user).catch(() => {});
    }

    res.json({
      token,
      refreshToken,
      user: { id: user.id, phone: user.phone, full_name: user.full_name },
      business: business || null,
      onboardingComplete: !!business,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    await User.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err.code === 'WRONG_PASSWORD') return res.status(401).json({ error: 'Current password is incorrect' });
    res.status(500).json({ error: 'Failed to update password' });
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

exports.registerPushToken = async (req, res) => {
  try {
    const { token, userType } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    const { saveToken } = require('../services/pushService');
    await saveToken(token, userType || 'business', req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save push token' });
  }
};
