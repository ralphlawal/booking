const Business = require('../models/Business');
const QRCode = require('qrcode');

exports.getMyBusiness = async (req, res) => {
  res.json(req.business);
};

exports.createBusiness = async (req, res) => {
  try {
    const existing = await Business.findByUserId(req.user.id);
    if (existing) return res.status(409).json({ error: 'Business already exists' });

    const slugExists = await Business.slugExists(req.body.slug);
    if (slugExists) return res.status(409).json({ error: 'This username is already taken' });

    const business = await Business.create({ ...req.body, user_id: req.user.id });
    res.status(201).json(business);
  } catch (err) {
    console.error('Create business error:', err);
    res.status(500).json({ error: 'Failed to create business' });
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const updated = await Business.update(req.business.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mime = req.file.mimetype || 'image/jpeg';
    const logo_url = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    const updated = await Business.update(req.business.id, { logo_url });
    res.json({ logo_url, business: updated });
  } catch (err) {
    console.error('[uploadLogo]', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

exports.getPublicBusiness = async (req, res) => {
  try {
    const business = await Business.findBySlug(req.params.slug);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    // Strip internal fields
    const { user_id, ...pub } = business;
    res.json(pub);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
};

exports.checkSlug = async (req, res) => {
  const exists = await Business.slugExists(req.params.slug);
  res.json({ available: !exists });
};

exports.getQRCode = async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${frontendUrl}/book/${req.business.slug}`;
    const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
};

exports.requestVerification = async (req, res) => {
  try {
    const biz = req.business;
    if (biz.is_verified) return res.status(400).json({ error: 'Already verified' });
    const { sendEmail } = require('../services/emailService');
    const adminEmail = process.env.ADMIN_EMAIL || 'ralphlawal2003@gmail.com';
    await sendEmail({
      to: adminEmail,
      subject: `Verification Request: ${biz.name}`,
      type: 'verification_request',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#4f46e5,#6d28d9);padding:28px 32px;text-align:center">
          <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779054818/99A671C3-1992-4C69-A170-BB994A854543_tf8sb4.png" alt="BookAm" style="height:32px;filter:brightness(0) invert(1)" />
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Verification Request</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 20px">A business has requested a verified badge on BookAm.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">Business</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.name}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Category</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.category || '—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px">Location</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.location || '—'}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Phone</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.phone || '—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px">Email</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.email || '—'}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Business ID</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-family:monospace">${biz.id}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:20px 0 0">To approve: run <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">UPDATE businesses SET is_verified = TRUE WHERE id = '${biz.id}';</code> in your database.</p>
        </div>
      </div>`,
    });
    res.json({ message: 'Verification request submitted. We will review and respond within 2 business days.' });
  } catch (err) {
    console.error('Verification request error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};
