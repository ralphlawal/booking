const https = require('https');
const Business = require('../models/Business');
const QRCode = require('qrcode');
const { checkAutoVerify } = require('../utils/autoVerify');
const { saveUploadedMedia } = require('../utils/mediaStorage');

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
  try {
    const db = require('../config/database');
    const { rows: [{ active_services_count }] } = await db.query(
      'SELECT COUNT(*) AS active_services_count FROM services WHERE business_id = $1 AND is_active = TRUE',
      [req.business.id]
    );
    res.json({ ...req.business, active_services_count: parseInt(active_services_count) });
  } catch {
    res.json(req.business);
  }
};

exports.createBusiness = async (req, res) => {
  try {
    const existing = await Business.findByUserId(req.user.id);
    if (existing) return res.status(409).json({ error: 'Business already exists' });

    const slugExists = await Business.slugExists(req.body.slug);
    if (slugExists) return res.status(409).json({ error: 'This username is already taken' });

    const body = { ...req.body };
    if (body.location && body.latitude === undefined && body.longitude === undefined) {
      const geo = await geocodeLocation(body.location);
      if (geo) { body.latitude = geo.lat; body.longitude = geo.lon; }
    }

    const business = await Business.create({ ...body, user_id: req.user.id });
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
    const logo_url = await saveUploadedMedia(req.file, 'business-logos');
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

    // Profile completeness gate — must be done before we can verify them
    if (!biz.logo_url)
      return res.status(400).json({ error: 'Please upload a business logo before requesting verification.' });
    if (!biz.location?.trim())
      return res.status(400).json({ error: 'Please set your business location before requesting verification.' });
    if (!biz.description?.trim())
      return res.status(400).json({ error: 'Please add a business description before requesting verification.' });
    if (!biz.phone?.trim())
      return res.status(400).json({ error: 'Please add a phone number before requesting verification.' });

    const db = require('../config/database');
    const { rows: [{ count: svcCount }] } = await db.query(
      'SELECT COUNT(*) FROM services WHERE business_id = $1 AND is_active = TRUE',
      [biz.id]
    );
    if (parseInt(svcCount) < 1)
      return res.status(400).json({ error: 'Please add at least one active service before requesting verification.' });

    const { legal_name, company_reg_number, sole_trader, business_address, contact_person, id_type } = req.body;
    if (!legal_name?.trim()) return res.status(400).json({ error: 'Legal business name is required.' });
    if (!company_reg_number && !sole_trader) return res.status(400).json({ error: 'Company registration number or sole trader declaration is required.' });
    if (!business_address?.trim()) return res.status(400).json({ error: 'Registered business address is required.' });
    if (!contact_person?.trim()) return res.status(400).json({ error: 'Contact person name is required.' });

    const details = { legal_name, company_reg_number: company_reg_number || null, sole_trader: !!sole_trader, business_address, contact_person, id_type };

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

// POST /api/business/admin/geocode-backfill
// One-time operation: geocodes all businesses that have location text but no coordinates.
// Rate-limited to 1 request/second to respect Nominatim ToS.
exports.geocodeBackfill = async (req, res) => {
  const db = require('../config/database');
  try {
    const { rows } = await db.query(
      `SELECT id, location FROM businesses
       WHERE location IS NOT NULL AND location != ''
         AND (latitude IS NULL OR longitude IS NULL)
       LIMIT 50`
    );
    if (!rows.length) return res.json({ updated: 0, message: 'All businesses already have coordinates' });

    let updated = 0;
    for (const biz of rows) {
      const geo = await geocodeLocation(biz.location);
      if (geo) {
        await db.query(
          'UPDATE businesses SET latitude = $1, longitude = $2 WHERE id = $3',
          [geo.lat, geo.lon, biz.id]
        );
        updated++;
      }
      // 1 second delay to respect Nominatim rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
    res.json({ checked: rows.length, updated, message: `${updated} businesses geocoded` });
  } catch (err) {
    console.error('[geocode-backfill]', err.message);
    res.status(500).json({ error: 'Backfill failed' });
  }
};

// PUT /api/business/me/bank-details
exports.saveBankDetails = async (req, res) => {
  try {
    const {
      holder_name,
      bank_country,
      country,
      bank_currency,
      currency,
      bank_name,
      sort_code,
      account_number,
      routing_number,
      iban,
      bic_swift,
      bic,
    } = req.body;

    const cleanHolder = (holder_name || '').trim();
    const cleanCountry = (bank_country || country || 'GB').trim().toUpperCase();
    const cleanCurrency = (bank_currency || currency || 'GBP').trim().toUpperCase();
    const cleanBankName = (bank_name || '').trim() || null;
    const cleanSort = sort_code ? sort_code.replace(/[-\s]/g, '') : null;
    const cleanAccount = account_number ? account_number.replace(/\s/g, '') : null;
    const cleanRouting = routing_number ? routing_number.replace(/\s/g, '') : null;
    const cleanIban = iban ? iban.replace(/\s/g, '').toUpperCase() : null;
    const cleanBic = (bic_swift || bic) ? (bic_swift || bic).replace(/\s/g, '').toUpperCase() : null;

    if (cleanHolder.length < 2) {
      return res.status(400).json({ error: 'Account holder name is required' });
    }
    if (!/^[A-Z]{2,5}$/.test(cleanCountry)) {
      return res.status(400).json({ error: 'Choose a valid bank country' });
    }
    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      return res.status(400).json({ error: 'Choose a valid payout currency' });
    }
    if (cleanIban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleanIban)) {
      return res.status(400).json({ error: 'IBAN format looks incorrect' });
    }
    if (cleanBic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(cleanBic)) {
      return res.status(400).json({ error: 'BIC/SWIFT code must be 8 or 11 characters' });
    }

    if (cleanCountry === 'GB' && !cleanIban) {
      if (!/^\d{6}$/.test(cleanSort || '')) {
        return res.status(400).json({ error: 'UK sort code must be 6 digits (e.g. 20-00-00)' });
      }
      if (!/^\d{8}$/.test(cleanAccount || '')) {
        return res.status(400).json({ error: 'UK account number must be 8 digits' });
      }
    } else if (cleanCountry === 'US' && !cleanIban) {
      if (!/^\d{9}$/.test(cleanRouting || '')) {
        return res.status(400).json({ error: 'US routing number must be 9 digits' });
      }
      if (!/^[A-Z0-9-]{4,17}$/i.test(cleanAccount || '')) {
        return res.status(400).json({ error: 'US account number must be 4 to 17 characters' });
      }
    } else if (!cleanIban && !cleanAccount) {
      return res.status(400).json({ error: 'Enter an IBAN or local account number' });
    }

    const db = require('../config/database');
    await db.query(
      `UPDATE businesses SET
         bank_holder_name = $1,
         bank_sort_code = $2,
         bank_account_number = $3,
         bank_country = $4,
         bank_currency = $5,
         bank_name = $6,
         bank_iban = $7,
         bank_bic = $8,
         bank_routing_number = $9,
         bank_updated_at = NOW()
       WHERE id = $10`,
      [
        cleanHolder,
        cleanSort,
        cleanAccount,
        cleanCountry,
        cleanCurrency,
        cleanBankName,
        cleanIban,
        cleanBic,
        cleanRouting,
        req.business.id,
      ]
    );
    res.json({ message: 'Bank details saved securely' });
  } catch (err) {
    console.error('saveBankDetails error:', err);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
};
