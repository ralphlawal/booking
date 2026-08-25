const db = require('../config/database');
const crypto = require('crypto');
const { createImageUpload } = require('../middleware/upload');
const { saveUploadedMedia } = require('../utils/mediaStorage');

exports.uploadMiddleware = createImageUpload({ fieldName: 'photo', fileSize: 10 * 1024 * 1024, label: 'Photo' });

exports.listPublic = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      'SELECT * FROM business_photos WHERE business_id=$1 ORDER BY sort_order ASC, created_at ASC',
      [biz[0].id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load photos' });
  }
};

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM business_photos WHERE business_id=$1 ORDER BY sort_order ASC, created_at ASC',
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load photos' });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mime = req.file.mimetype;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mime)) return res.status(400).json({ error: 'Only JPEG/PNG/WebP allowed' });
    const url = await saveUploadedMedia(req.file, 'business-photos');
    const caption = req.body.caption || null;
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO business_photos (id, business_id, url, caption)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, req.business.id, url, caption]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[photos/upload]', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM business_photos WHERE id=$1 AND business_id=$2', [req.params.id, req.business.id]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};

exports.reorder = async (req, res) => {
  try {
    const { order } = req.body; // array of { id, sort_order }
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' });
    for (const item of order) {
      await db.query(
        'UPDATE business_photos SET sort_order=$1 WHERE id=$2 AND business_id=$3',
        [item.sort_order, item.id, req.business.id]
      );
    }
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
};
