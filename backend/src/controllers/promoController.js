const db = require('../config/database');
const crypto = require('crypto');

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM promo_codes WHERE business_id=$1 ORDER BY created_at DESC',
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load promo codes' });
  }
};

exports.create = async (req, res) => {
  try {
    const { code, type, value, min_order_amount, max_uses, valid_from, valid_until } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Code is required' });
    if (!['percent','fixed'].includes(type)) return res.status(400).json({ error: 'type must be percent or fixed' });
    if (!value || isNaN(value) || value <= 0) return res.status(400).json({ error: 'value must be a positive number' });
    if (type === 'percent' && value > 100) return res.status(400).json({ error: 'Percent discount cannot exceed 100' });
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO promo_codes (id, business_id, code, type, value, min_order_amount, max_uses, valid_from, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, req.business.id, code.trim().toUpperCase(), type, value, min_order_amount||0, max_uses||null, valid_from||null, valid_until||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This promo code already exists for your business' });
    console.error('[promo/create]', err.message);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
};

exports.update = async (req, res) => {
  try {
    const { is_active, valid_until } = req.body;
    const { rows } = await db.query(
      `UPDATE promo_codes SET is_active=COALESCE($1,is_active), valid_until=COALESCE($2,valid_until)
       WHERE id=$3 AND business_id=$4 RETURNING *`,
      [is_active??null, valid_until||null, req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Promo code not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update promo code' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM promo_codes WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
};

// POST /api/promo/validate  — public: validate code before booking
exports.validate = async (req, res) => {
  try {
    const { code, business_slug, order_amount } = req.body;
    if (!code || !business_slug) return res.status(400).json({ error: 'code and business_slug are required' });
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [business_slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT * FROM promo_codes
       WHERE business_id=$1 AND UPPER(code)=UPPER($2) AND is_active=TRUE
         AND (valid_from IS NULL OR valid_from <= $3)
         AND (valid_until IS NULL OR valid_until >= $3)
         AND (max_uses IS NULL OR uses_count < max_uses)`,
      [biz[0].id, code.trim(), today]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired promo code' });
    const promo = rows[0];
    const amount = parseFloat(order_amount) || 0;
    if (amount < parseFloat(promo.min_order_amount || 0)) {
      return res.status(400).json({ error: `Minimum order £${parseFloat(promo.min_order_amount).toFixed(2)} required for this code` });
    }
    let discount = 0;
    if (promo.type === 'percent') {
      discount = Math.round((amount * parseFloat(promo.value) / 100) * 100) / 100;
    } else {
      discount = Math.min(parseFloat(promo.value), amount);
    }
    res.json({ valid: true, promo: { id: promo.id, code: promo.code, type: promo.type, value: parseFloat(promo.value) }, discount });
  } catch (err) {
    console.error('[promo/validate]', err.message);
    res.status(500).json({ error: 'Failed to validate promo code' });
  }
};
