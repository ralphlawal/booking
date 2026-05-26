const db = require('../config/database');
const crypto = require('crypto');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('image');

const ALLOWED_TYPES = ['photo', 'offer', 'availability', 'announcement'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/posts
exports.create = async (req, res) => {
  try {
    const { type = 'photo', caption, cta_label, cta_service_id, offer_text, offer_expires_at } = req.body;
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid post type' });
    if (!caption?.trim() && !req.file) return res.status(400).json({ error: 'Caption or image is required' });

    let image_url = null;
    if (req.file) {
      if (!ALLOWED_MIME.includes(req.file.mimetype))
        return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' });
      image_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const { rows } = await db.query(
      `INSERT INTO business_posts
         (id, business_id, type, caption, image_url, cta_label, cta_service_id, offer_text, offer_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        crypto.randomUUID(),
        req.business.id,
        type,
        caption?.trim() || null,
        image_url,
        cta_label?.trim() || null,
        cta_service_id || null,
        offer_text?.trim() || null,
        offer_expires_at || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[posts/create]', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// GET /api/posts
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, s.name AS service_name
       FROM business_posts p
       LEFT JOIN services s ON s.id = p.cta_service_id
       WHERE p.business_id = $1
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/list]', err.message);
    res.status(500).json({ error: 'Failed to load posts' });
  }
};

// GET /api/posts/public/:slug
exports.getPublic = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      `SELECT p.*, s.name AS service_name, s.price AS service_price
       FROM business_posts p
       LEFT JOIN services s ON s.id = p.cta_service_id
       WHERE p.business_id = $1 AND p.is_active = TRUE
       ORDER BY p.created_at DESC LIMIT 30`,
      [biz[0].id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/public]', err.message);
    res.status(500).json({ error: 'Failed to load posts' });
  }
};

// GET /api/posts/feed
exports.getFeed = async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    const params = [];
    let where = 'WHERE p.is_active = TRUE AND b.is_active = TRUE';
    if (category) {
      params.push(category);
      where += ` AND LOWER(b.category) = LOWER($${params.length})`;
    }
    params.push(Math.min(parseInt(limit, 10) || 20, 50));
    params.push(Math.max(parseInt(offset, 10) || 0, 0));

    const { rows } = await db.query(
      `SELECT p.*,
              b.name AS business_name, b.slug AS business_slug,
              b.logo_url, b.category AS business_category, b.is_verified,
              COALESCE(r.avg_rating, 0) AS avg_rating,
              COALESCE(r.review_count, 0) AS review_count,
              s.name AS service_name, s.price AS service_price
       FROM business_posts p
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN services s ON s.id = p.cta_service_id
       LEFT JOIN (
         SELECT business_id,
                ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
                COUNT(*) AS review_count
         FROM reviews GROUP BY business_id
       ) r ON r.business_id = b.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/feed]', err.message);
    res.status(500).json({ error: 'Failed to load feed' });
  }
};

// DELETE /api/posts/:id
exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM business_posts WHERE id=$1 AND business_id=$2',
      [req.params.id, req.business.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[posts/delete]', err.message);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// POST /api/posts/:id/view
exports.recordView = async (req, res) => {
  try {
    await db.query('UPDATE business_posts SET views = views + 1 WHERE id=$1 AND is_active=TRUE', [req.params.id]);
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
};

// POST /api/posts/:id/book-click
exports.recordBookClick = async (req, res) => {
  try {
    await db.query('UPDATE business_posts SET booking_clicks = booking_clicks + 1 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
};
