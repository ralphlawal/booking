const db = require('../config/database');
const crypto = require('crypto');

// POST /api/reviews  — consumer submits review after completed booking
exports.create = async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;
    if (!booking_id || !rating) return res.status(400).json({ error: 'booking_id and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });

    // Fetch booking — must be completed and belong to this consumer
    const { rows: bRows } = await db.query(
      `SELECT id, business_id, customer_id, consumer_id, status
       FROM bookings WHERE id = $1`,
      [booking_id]
    );
    const booking = bRows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.consumer_id !== req.consumer.id)
      return res.status(403).json({ error: 'Not your booking' });
    if (booking.status !== 'completed')
      return res.status(400).json({ error: 'Can only review completed bookings' });

    // Check not already reviewed
    const { rows: existing } = await db.query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [booking_id]
    );
    if (existing.length) return res.status(409).json({ error: 'Already reviewed' });

    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO reviews (id, booking_id, business_id, customer_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, booking_id, booking.business_id, booking.customer_id, rating, comment || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[reviews/create]', err.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// GET /api/reviews/:slug  — get all reviews for a business (public)
exports.getForBusiness = async (req, res) => {
  try {
    const { rows: biz } = await db.query(
      'SELECT id FROM businesses WHERE slug = $1',
      [req.params.slug]
    );
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });

    let rows;
    try {
      ({ rows } = await db.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                ca.full_name AS reviewer_name,
                rr.reply_text, rr.created_at AS reply_at
         FROM reviews r
         LEFT JOIN bookings b ON b.id = r.booking_id
         LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
         LEFT JOIN review_replies rr ON rr.review_id = r.id
         WHERE r.business_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [biz[0].id]
      ));
    } catch {
      // review_replies table may not exist yet (migration 014 pending)
      ({ rows } = await db.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                ca.full_name AS reviewer_name,
                NULL AS reply_text, NULL AS reply_at
         FROM reviews r
         LEFT JOIN bookings b ON b.id = r.booking_id
         LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
         WHERE r.business_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [biz[0].id]
      ));
    }

    const { rows: stats } = await db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(AVG(rating), 0)::FLOAT AS avg_rating,
              COUNT(*) FILTER (WHERE rating = 5) AS five_star,
              COUNT(*) FILTER (WHERE rating = 4) AS four_star,
              COUNT(*) FILTER (WHERE rating = 3) AS three_star,
              COUNT(*) FILTER (WHERE rating = 2) AS two_star,
              COUNT(*) FILTER (WHERE rating = 1) AS one_star
       FROM reviews WHERE business_id = $1`,
      [biz[0].id]
    );

    res.json({ reviews: rows, stats: stats[0] });
  } catch (err) {
    console.error('[reviews/get]', err.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// POST /api/reviews/:id/reply  — business owner replies to a review
exports.reply = async (req, res) => {
  try {
    const { reply_text } = req.body;
    if (!reply_text?.trim()) return res.status(400).json({ error: 'Reply text required' });
    // Verify review belongs to this business
    const { rows: rRows } = await db.query(
      'SELECT id FROM reviews WHERE id=$1 AND business_id=$2',
      [req.params.id, req.business.id]
    );
    if (!rRows.length) return res.status(404).json({ error: 'Review not found' });
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO review_replies (id, review_id, business_id, reply_text)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (review_id) DO UPDATE SET reply_text=$4, created_at=NOW()`,
      [id, req.params.id, req.business.id, reply_text.trim()]
    );
    res.json({ message: 'Reply saved' });
  } catch (err) {
    console.error('[reviews/reply]', err.message);
    if (err.message?.includes('review_replies')) return res.status(503).json({ error: 'Review replies not available yet' });
    res.status(500).json({ error: 'Failed to save reply' });
  }
};

// DELETE /api/reviews/:id/reply  — business removes their reply
exports.deleteReply = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM review_replies WHERE review_id=$1 AND business_id=$2',
      [req.params.id, req.business.id]
    );
    res.json({ message: 'Reply deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reply' });
  }
};

// GET /api/reviews/check/:bookingId  — can this consumer review this booking?
exports.checkReviewable = async (req, res) => {
  try {
    const { rows: bRows } = await db.query(
      'SELECT status, consumer_id FROM bookings WHERE id = $1',
      [req.params.bookingId]
    );
    if (!bRows.length) return res.json({ can_review: false });
    const b = bRows[0];
    if (b.consumer_id !== req.consumer.id || b.status !== 'completed')
      return res.json({ can_review: false });

    const { rows: rRows } = await db.query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [req.params.bookingId]
    );
    res.json({ can_review: rRows.length === 0 });
  } catch (err) {
    res.json({ can_review: false });
  }
};
