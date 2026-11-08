const db = require('../config/database');
const crypto = require('crypto');
const { createUpload } = require('../middleware/upload');
const { saveUploadedMedia } = require('../utils/mediaStorage');

const ALLOWED_TYPES = ['photo', 'offer', 'availability', 'announcement'];
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

exports.uploadMiddleware = createUpload({
  fieldName: 'image',
  fileSize: 35 * 1024 * 1024,
  label: 'Post media',
  mimeTypes: ALLOWED_MIME,
});

// Columns returned for every public feed/profile post query.
// Caller injects consumer engagement columns when consumerId is known.
const POST_COLS = `
  p.id, p.type, p.caption, p.image_url, p.video_url, p.cta_label, p.cta_service_id,
  p.offer_text, p.offer_expires_at, p.is_active, p.views, p.booking_clicks,
  p.like_count, p.save_count, p.created_at,
  CASE WHEN p.offer_expires_at IS NOT NULL AND p.offer_expires_at < NOW()
       THEN TRUE ELSE FALSE END AS is_expired,
  b.name AS business_name, b.slug AS business_slug,
  b.logo_url, b.category AS business_category, b.is_verified,
  COALESCE(r.avg_rating, 0) AS avg_rating,
  COALESCE(r.review_count, 0) AS review_count,
  s.name AS service_name, s.price AS service_price, s.duration_minutes AS service_duration
`;

const REVIEW_JOIN = `
  LEFT JOIN (
    SELECT business_id,
           ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
           COUNT(*) AS review_count
    FROM reviews GROUP BY business_id
  ) r ON r.business_id = b.id
`;

// Attach per-consumer like/save state; returns two extra boolean columns.
function consumerEngagementCols(consumerId) {
  if (!consumerId) return { cols: `FALSE AS liked_by_me, FALSE AS saved_by_me`, params: [] };
  return {
    cols: `
      EXISTS(SELECT 1 FROM post_likes  pl WHERE pl.post_id = p.id AND pl.consumer_id = $__CID__) AS liked_by_me,
      EXISTS(SELECT 1 FROM post_saves  ps WHERE ps.post_id = p.id AND ps.consumer_id = $__CID__) AS saved_by_me
    `,
    params: [consumerId],
  };
}

// POST /api/posts
exports.create = async (req, res) => {
  try {
    const { type = 'photo', caption, cta_label, cta_service_id, offer_text, offer_expires_at } = req.body;
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid post type' });
    if (!caption?.trim() && !req.file)  return res.status(400).json({ error: 'Caption or image is required' });

    const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
    let image_url = null;
    let video_url = null;
    if (req.file) {
      if (!ALLOWED_MIME.includes(req.file.mimetype))
        return res.status(400).json({ error: 'Only JPEG, PNG, WebP, MP4, WebM, or MOV files are allowed' });
      const mediaUrl = await saveUploadedMedia(req.file, 'business-posts');
      if (VIDEO_MIME.includes(req.file.mimetype)) {
        video_url = mediaUrl;
      } else {
        image_url = mediaUrl;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO business_posts
         (id, business_id, type, caption, image_url, video_url, cta_label, cta_service_id, offer_text, offer_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        crypto.randomUUID(),
        req.business.id,
        type,
        caption?.trim() || null,
        image_url,
        video_url,
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

// GET /api/posts  (business-authenticated: own posts)
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,
              CASE WHEN p.offer_expires_at IS NOT NULL AND p.offer_expires_at < NOW()
                   THEN TRUE ELSE FALSE END AS is_expired,
              s.name AS service_name, s.price AS service_price
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
    const consumerId = req.consumerId || null;
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Not found' });

    const eng = consumerEngagementCols(consumerId);
    // Replace placeholder with actual param index
    const cidIdx = eng.params.length ? 3 : null;
    const engCols = cidIdx ? eng.cols.replace(/__CID__/g, cidIdx) : eng.cols;
    const params  = [biz[0].id];
    if (cidIdx) params.push(consumerId);

    const { rows } = await db.query(
      `SELECT ${POST_COLS}, ${engCols}
       FROM business_posts p
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN services s ON s.id = p.cta_service_id
       ${REVIEW_JOIN}
       WHERE p.business_id = $1 AND p.is_active = TRUE
       ORDER BY p.created_at DESC LIMIT 30`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/public]', err.message);
    res.status(500).json({ error: 'Failed to load posts' });
  }
};

// GET /api/posts/feed  (discover: no auth required, but consumer token enriches engagement cols)
exports.getFeed = async (req, res) => {
  try {
    const consumerId = req.consumerId || null;
    const { category, limit = 20, offset = 0 } = req.query;
    const params = [];
    let where = 'WHERE p.is_active = TRUE AND b.is_active = TRUE';

    if (category) {
      params.push(category);
      where += ` AND LOWER(b.category) = LOWER($${params.length})`;
    }

    params.push(Math.min(parseInt(limit, 10) || 20, 50));
    params.push(Math.max(parseInt(offset, 10) || 0, 0));
    const limitIdx  = params.length - 1;
    const offsetIdx = params.length;

    const eng = consumerEngagementCols(consumerId);
    let engCols = eng.cols;
    if (consumerId) {
      params.push(consumerId);
      engCols = eng.cols.replace(/__CID__/g, params.length);
    }

    const { rows } = await db.query(
      `SELECT ${POST_COLS}, ${engCols}
       FROM business_posts p
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN services s ON s.id = p.cta_service_id
       ${REVIEW_JOIN}
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
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

// POST /api/posts/:id/like  (consumer auth required)
exports.like = async (req, res) => {
  try {
    const { id } = req.params;
    const consumerId = req.consumerId;
    await db.query(
      'INSERT INTO post_likes (id, post_id, consumer_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [crypto.randomUUID(), id, consumerId]
    );
    await db.query(
      'UPDATE business_posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id=$1) WHERE id=$1',
      [id]
    );
    const { rows } = await db.query('SELECT like_count FROM business_posts WHERE id=$1', [id]);
    res.json({ liked: true, like_count: rows[0]?.like_count ?? 0 });
  } catch (err) {
    console.error('[posts/like]', err.message);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

// DELETE /api/posts/:id/like  (consumer auth required)
exports.unlike = async (req, res) => {
  try {
    const { id } = req.params;
    const consumerId = req.consumerId;
    await db.query('DELETE FROM post_likes WHERE post_id=$1 AND consumer_id=$2', [id, consumerId]);
    await db.query(
      'UPDATE business_posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id=$1) WHERE id=$1',
      [id]
    );
    const { rows } = await db.query('SELECT like_count FROM business_posts WHERE id=$1', [id]);
    res.json({ liked: false, like_count: rows[0]?.like_count ?? 0 });
  } catch (err) {
    console.error('[posts/unlike]', err.message);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
};

// POST /api/posts/:id/save  (consumer auth required)
exports.save = async (req, res) => {
  try {
    const { id } = req.params;
    const consumerId = req.consumerId;
    await db.query(
      'INSERT INTO post_saves (id, post_id, consumer_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [crypto.randomUUID(), id, consumerId]
    );
    await db.query(
      'UPDATE business_posts SET save_count = (SELECT COUNT(*) FROM post_saves WHERE post_id=$1) WHERE id=$1',
      [id]
    );
    const { rows } = await db.query('SELECT save_count FROM business_posts WHERE id=$1', [id]);
    res.json({ saved: true, save_count: rows[0]?.save_count ?? 0 });
  } catch (err) {
    console.error('[posts/save]', err.message);
    res.status(500).json({ error: 'Failed to save post' });
  }
};

// DELETE /api/posts/:id/save  (consumer auth required)
exports.unsave = async (req, res) => {
  try {
    const { id } = req.params;
    const consumerId = req.consumerId;
    await db.query('DELETE FROM post_saves WHERE post_id=$1 AND consumer_id=$2', [id, consumerId]);
    await db.query(
      'UPDATE business_posts SET save_count = (SELECT COUNT(*) FROM post_saves WHERE post_id=$1) WHERE id=$1',
      [id]
    );
    const { rows } = await db.query('SELECT save_count FROM business_posts WHERE id=$1', [id]);
    res.json({ saved: false, save_count: rows[0]?.save_count ?? 0 });
  } catch (err) {
    console.error('[posts/unsave]', err.message);
    res.status(500).json({ error: 'Failed to unsave post' });
  }
};

// GET /api/posts/saved  (consumer auth: their saved posts)
exports.getSaved = async (req, res) => {
  try {
    const consumerId = req.consumerId;
    const limit  = Math.min(parseInt(req.query.limit,  10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,   0);
    const { rows } = await db.query(
      `SELECT ${POST_COLS},
              TRUE AS liked_by_me,
              TRUE AS saved_by_me
       FROM business_posts p
       JOIN post_saves ps2 ON ps2.post_id = p.id AND ps2.consumer_id = $1
       JOIN businesses b ON b.id = p.business_id
       LEFT JOIN services s ON s.id = p.cta_service_id
       ${REVIEW_JOIN}
       WHERE p.is_active = TRUE
       ORDER BY ps2.created_at DESC
       LIMIT $2 OFFSET $3`,
      [consumerId, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/saved]', err.message);
    res.status(500).json({ error: 'Failed to load saved posts' });
  }
};
