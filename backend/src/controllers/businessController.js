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
