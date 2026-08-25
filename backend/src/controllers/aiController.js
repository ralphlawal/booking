const db = require('../config/database');
const { summarizeReviews, scoreNoShowRisk, suggestRebookTiming, matchServiceQuery } = require('../services/aiService');

// GET /api/ai/review-summary/:slug
// Returns an AI-generated 2–3 sentence summary of all reviews for a business.
exports.reviewSummary = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Business not found' });

    const { rows: reviews } = await db.query(
      `SELECT rating, comment FROM reviews WHERE business_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [biz[0].id]
    );

    if (reviews.length < 3) {
      return res.json({ summary: null, reason: 'not_enough_reviews', count: reviews.length });
    }

    const summary = await summarizeReviews(reviews);
    res.json({ summary, count: reviews.length });
  } catch (err) {
    console.error('[ai/review-summary]', err.message);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

// GET /api/ai/noshow-risk/:bookingId
// Returns no-show risk level for a specific booking (business-auth required).
exports.noshowRisk = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.consumer_id, b.booking_date, b.created_at,
              ca.no_show_count,
              COUNT(b2.id) AS total_bookings
       FROM bookings b
       LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
       LEFT JOIN bookings b2 ON b2.consumer_id = b.consumer_id
       WHERE b.id = $1 AND b.business_id = $2
       GROUP BY b.consumer_id, b.booking_date, b.created_at, ca.no_show_count`,
      [req.params.bookingId, req.business.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const row = rows[0];

    if (!row.consumer_id) {
      return res.json({ level: null, reason: 'Guest booking — no account history available' });
    }

    const bookingDate = new Date(row.booking_date);
    const createdAt = new Date(row.created_at);
    const now = new Date();
    const days_until_appointment = Math.round((bookingDate - now) / (1000 * 60 * 60 * 24));
    const booking_created_hours_before = Math.round((bookingDate - createdAt) / (1000 * 60 * 60));

    const risk = scoreNoShowRisk({
      no_show_count: parseInt(row.no_show_count || 0),
      total_bookings: parseInt(row.total_bookings || 1),
      days_until_appointment,
      booking_created_hours_before,
    });

    res.json(risk);
  } catch (err) {
    console.error('[ai/noshow-risk]', err.message);
    res.status(500).json({ error: 'Failed to calculate risk' });
  }
};

// GET /api/ai/rebook-timing/:consumerId/:slug
// Returns AI rebooking timing suggestion for a business (business-auth required).
exports.rebookTiming = async (req, res) => {
  try {
    const { rows: bizRows } = await db.query('SELECT id, name FROM businesses WHERE slug=$1 AND id=$2', [req.params.slug, req.business.id]);
    if (!bizRows.length) return res.status(404).json({ error: 'Business not found' });

    const { rows: bookings } = await db.query(
      `SELECT b.booking_date, s.name AS service_name
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       WHERE b.consumer_id=$1 AND b.business_id=$2 AND b.status='completed'
       ORDER BY b.booking_date DESC
       LIMIT 10`,
      [req.params.consumerId, req.business.id]
    );

    if (bookings.length < 2) {
      return res.json({ suggestion: null, reason: 'not_enough_history' });
    }

    const suggestion = await suggestRebookTiming({
      businessName: bizRows[0].name,
      serviceName: bookings[0]?.service_name,
      pastBookings: bookings,
    });

    res.json({ suggestion });
  } catch (err) {
    console.error('[ai/rebook-timing]', err.message);
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
};

// POST /api/ai/match-service
// Interprets a natural-language query into structured search params.
// Public endpoint — no auth needed.
exports.matchService = async (req, res) => {
  try {
    const { q } = req.body;
    if (!q?.trim()) return res.status(400).json({ error: 'q is required' });
    const result = await matchServiceQuery(q.trim());
    res.json(result);
  } catch (err) {
    console.error('[ai/match-service]', err.message);
    res.status(500).json({ error: 'Failed to match service' });
  }
};
