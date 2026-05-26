const db = require('../config/database');

const FEED_QUERY = `
  SELECT p.*,
         CASE WHEN p.offer_expires_at IS NOT NULL AND p.offer_expires_at < NOW()
              THEN TRUE ELSE FALSE END AS is_expired,
         b.name AS business_name, b.slug AS business_slug,
         b.logo_url, b.category AS business_category, b.is_verified,
         COALESCE(r.avg_rating, 0) AS avg_rating,
         COALESCE(r.review_count, 0) AS review_count,
         s.name AS service_name, s.price AS service_price
  FROM business_posts p
  JOIN businesses b ON b.id = p.business_id
  JOIN consumer_follows f ON f.business_id = b.id AND f.consumer_id = $1
  LEFT JOIN services s ON s.id = p.cta_service_id
  LEFT JOIN (
    SELECT business_id,
           ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
           COUNT(*) AS review_count
    FROM reviews GROUP BY business_id
  ) r ON r.business_id = b.id
  WHERE p.is_active = TRUE AND b.is_active = TRUE
  ORDER BY p.created_at DESC
  LIMIT $2 OFFSET $3
`;

// POST /api/follows/:slug
exports.follow = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    await db.query(
      'INSERT INTO consumer_follows (consumer_id, business_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.consumerId, biz[0].id]
    );
    const { rows: cnt } = await db.query(
      'SELECT COUNT(*) AS count FROM consumer_follows WHERE business_id = $1',
      [biz[0].id]
    );
    res.json({ following: true, follower_count: parseInt(cnt[0].count) });
  } catch (err) {
    console.error('[follows/follow]', err.message);
    res.status(500).json({ error: 'Failed to follow' });
  }
};

// DELETE /api/follows/:slug
exports.unfollow = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });
    await db.query(
      'DELETE FROM consumer_follows WHERE consumer_id = $1 AND business_id = $2',
      [req.consumerId, biz[0].id]
    );
    const { rows: cnt } = await db.query(
      'SELECT COUNT(*) AS count FROM consumer_follows WHERE business_id = $1',
      [biz[0].id]
    );
    res.json({ following: false, follower_count: parseInt(cnt[0].count) });
  } catch (err) {
    console.error('[follows/unfollow]', err.message);
    res.status(500).json({ error: 'Failed to unfollow' });
  }
};

// GET /api/follows/check/:slug — requires consumer auth
exports.check = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.json({ following: false, follower_count: 0 });
    const [followRow, cntRow] = await Promise.all([
      db.query('SELECT id FROM consumer_follows WHERE consumer_id = $1 AND business_id = $2', [req.consumerId, biz[0].id]),
      db.query('SELECT COUNT(*) AS count FROM consumer_follows WHERE business_id = $1', [biz[0].id]),
    ]);
    res.json({ following: followRow.rows.length > 0, follower_count: parseInt(cntRow.rows[0].count) });
  } catch (err) {
    console.error('[follows/check]', err.message);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
};

// GET /api/follows/count/:slug — public, no auth
exports.count = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!biz.length) return res.json({ follower_count: 0 });
    const { rows } = await db.query(
      'SELECT COUNT(*) AS count FROM consumer_follows WHERE business_id = $1',
      [biz[0].id]
    );
    res.json({ follower_count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get follower count' });
  }
};

// GET /api/follows/feed — personalised following feed
exports.feed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows } = await db.query(FEED_QUERY, [req.consumerId, limit, offset]);
    res.json(rows);
  } catch (err) {
    console.error('[follows/feed]', err.message);
    res.status(500).json({ error: 'Failed to load following feed' });
  }
};
