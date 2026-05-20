const https = require('https');
const Business = require('../models/Business');
const QRCode = require('qrcode');
const { checkAutoVerify } = require('../utils/autoVerify');

function geocodeLocation(locationText) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(locationText);
    const options = {
      hostname: 'nominatim.openstreetmap.org',
      path: `/search?format=json&q=${q}&limit=1`,
      headers: { 'User-Agent': 'BookAm/1.0 (bookam.business)' },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json[0]) resolve({ lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) });
          else resolve(null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

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
    const body = { ...req.body };
    // Auto-geocode when location text changes but coordinates aren't supplied by client
    if (body.location && body.latitude === undefined && body.longitude === undefined) {
      const geo = await geocodeLocation(body.location);
      if (geo) { body.latitude = geo.lat; body.longitude = geo.lon; }
    }
    const updated = await Business.update(req.business.id, body);
    checkAutoVerify(req.business.id).catch(() => {});
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
    if (biz.is_verified || biz.verification_status === 'verified') return res.status(400).json({ error: 'Already verified' });
    const { sendEmail } = require('../services/emailService');
    const adminEmail = process.env.ADMIN_EMAIL || 'ralphlawal2003@gmail.com';
    await sendEmail({
      to: adminEmail,
      subject: `Verification Request: ${biz.name}`,
      type: 'verification_request',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#4f46e5,#6d28d9);padding:28px 32px;text-align:center">
          <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779210788/IMG_0364_cgkeo4.png" alt="BookAm Business" style="height:32px;filter:brightness(0) invert(1)" />
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Verification Request</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 20px">A business has requested a verified badge on BookAm Business.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">Business</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.name}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Category</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.category || '—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px">Location</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.location || '—'}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Reg No.</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.verification_details?.company_reg_number || (biz.verification_details?.sole_trader ? 'Sole Trader' : '—')}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:10px 14px;color:#64748b;font-size:14px">Legal Name</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${biz.verification_details?.legal_name || '—'}</td></tr>
            <tr><td style="padding:10px 14px;color:#64748b;font-size:14px">Business ID</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-family:monospace">${biz.id}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:20px 0 0">To approve: run <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">UPDATE businesses SET is_verified = TRUE, verification_status = 'verified', verified_at = NOW() WHERE id = '${biz.id}';</code> in your database.</p>
        </div>
      </div>`,
    });
    res.json({ message: 'Verification request submitted. We will review within 2 business days.' });
  } catch (err) {
    console.error('Verification request error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

// POST /api/business/me/verification-details
// Saves detailed verification info and auto-verifies if criteria met
exports.submitVerificationDetails = async (req, res) => {
  try {
    const biz = req.business;
    if (biz.is_verified || biz.verification_status === 'verified')
      return res.status(400).json({ error: 'Already verified' });

    const { legal_name, company_reg_number, sole_trader, business_address, contact_person, id_type } = req.body;
    if (!legal_name) return res.status(400).json({ error: 'Legal business name is required' });
    if (!company_reg_number && !sole_trader) return res.status(400).json({ error: 'Company registration number or sole trader declaration is required' });

    const details = { legal_name, company_reg_number: company_reg_number || null, sole_trader: !!sole_trader, business_address, contact_person, id_type };

    const db = require('../config/database');
    await db.query(
      `UPDATE businesses SET verification_details = $1, verification_status = 'pending',
       verification_requested_at = NOW() WHERE id = $2`,
      [JSON.stringify(details), biz.id]
    );

    // Attempt auto-verify immediately
    const { checkAutoVerify } = require('../utils/autoVerify');
    const autoVerified = await checkAutoVerify(biz.id);

    if (autoVerified) {
      return res.json({ status: 'verified', message: 'Your business has been automatically verified!' });
    }

    // Not auto-verified — send manual review email
    try {
      const { sendEmail } = require('../services/emailService');
      const adminEmail = process.env.ADMIN_EMAIL || 'ralphlawal2003@gmail.com';
      await sendEmail({
        to: adminEmail,
        subject: `Verification Submission: ${biz.name}`,
        type: 'verification_request',
        html: `<p>Business <strong>${biz.name}</strong> (ID: ${biz.id}) has submitted verification details for manual review.</p>
               <p>Legal Name: ${legal_name}</p>
               <p>Reg No: ${company_reg_number || 'N/A (sole trader)'}</p>
               <p>Address: ${business_address || '—'}</p>`,
      });
    } catch {}

    res.json({ status: 'pending', message: 'Details submitted. We will verify within 2 business days.' });
  } catch (err) {
    console.error('submitVerificationDetails error:', err);
    res.status(500).json({ error: 'Failed to submit details' });
  }
};

// PUT /api/business/me/bank-details
exports.saveBankDetails = async (req, res) => {
  try {
    const { holder_name, sort_code, account_number } = req.body;
    if (!holder_name || !sort_code || !account_number)
      return res.status(400).json({ error: 'All bank detail fields are required' });

    // Basic format validation
    const cleanSort = sort_code.replace(/[-\s]/g, '');
    if (!/^\d{6}$/.test(cleanSort))
      return res.status(400).json({ error: 'Sort code must be 6 digits (e.g. 20-00-00)' });
    if (!/^\d{8}$/.test(account_number.replace(/\s/g, '')))
      return res.status(400).json({ error: 'Account number must be 8 digits' });

    const db = require('../config/database');
    await db.query(
      `UPDATE businesses SET
         bank_holder_name = $1,
         bank_sort_code = $2,
         bank_account_number = $3,
         bank_updated_at = NOW()
       WHERE id = $4`,
      [holder_name.trim(), cleanSort, account_number.replace(/\s/g, ''), req.business.id]
    );
    res.json({ message: 'Bank details saved securely' });
  } catch (err) {
    console.error('saveBankDetails error:', err);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
};
