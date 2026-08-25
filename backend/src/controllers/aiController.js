const db = require('../config/database');
const { summarizeReviews, scoreNoShowRisk, suggestRebookTiming, matchServiceQuery, chatBooking, generateBusinessDescription, suggestGapFilling, suggestStaffReassignment, personaliseReEngagement } = require('../services/aiService');

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

// POST /api/ai/chat-booking/:slug
// Stateless AI booking chat. Takes conversation history + current bookingState.
// Returns { reply, bookingState, readyToBook }.
// When readyToBook is true, the frontend calls bookingsAPI.create() directly.
exports.chatBooking = async (req, res) => {
  try {
    const { slug } = req.params;
    const { messages = [], bookingState = {} } = req.body;

    // Load business + services
    const { rows: bizRows } = await db.query(
      'SELECT id, name FROM businesses WHERE slug=$1 AND is_active=TRUE',
      [slug]
    );
    if (!bizRows.length) return res.status(404).json({ error: 'Business not found' });
    const biz = bizRows[0];

    const { rows: services } = await db.query(
      'SELECT id, name, price, duration_minutes, description FROM services WHERE business_id=$1 AND is_active=TRUE ORDER BY created_at',
      [biz.id]
    );

    // If we have service + date, fetch real availability
    let availableSlots = null;
    if (bookingState.service_id && bookingState.date) {
      try {
        const { rows: avRows } = await db.query(
          'SELECT * FROM availability_settings WHERE business_id=$1',
          [biz.id]
        );
        if (avRows.length) {
          const av = avRows[0];
          const svc = services.find(s => s.id === bookingState.service_id);
          if (svc) {
            const { rows: existingBookings } = await db.query(
              `SELECT start_time, end_time FROM bookings
               WHERE business_id=$1 AND booking_date=$2 AND status NOT IN ('cancelled')`,
              [biz.id, bookingState.date]
            );
            const { rows: blocked } = await db.query(
              'SELECT * FROM blocked_slots WHERE business_id=$1 AND blocked_date=$2',
              [biz.id, bookingState.date]
            );
            if (!blocked.some(b => b.is_full_day)) {
              availableSlots = generateSlots(av, svc.duration_minutes, existingBookings, blocked);
            } else {
              availableSlots = [];
            }
          }
        }
      } catch {}
    }

    const today = new Date().toISOString().split('T')[0];
    const result = await chatBooking({ businessName: biz.name, services, availableSlots, messages, bookingState, today });
    res.json(result);
  } catch (err) {
    console.error('[ai/chat-booking]', err.message);
    res.status(500).json({ error: 'Chat failed' });
  }
};

function timeToMin(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}
function generateSlots(av, duration, existingBookings, blockedSlots) {
  const slots = [];
  const open = timeToMin(av.opening_time || '09:00');
  const close = timeToMin(av.closing_time || '18:00');
  const buffer = av.buffer_minutes || 0;
  const interval = av.slot_interval_minutes || 30;
  let cur = open;
  while (cur + duration <= close) {
    const end = cur + duration;
    const busy = existingBookings.some(b => {
      const bs = timeToMin(b.start_time); const be = timeToMin(b.end_time);
      return cur < be + buffer && end > bs;
    }) || blockedSlots.some(b => {
      if (!b.start_time) return false;
      const bs = timeToMin(b.start_time); const be = timeToMin(b.end_time);
      return cur < be && end > bs;
    });
    if (!busy) {
      const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00`;
      slots.push({ start: fmt(cur), end: fmt(end) });
    }
    cur += interval;
  }
  return slots;
}

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

// POST /api/ai/generate-description (business-auth)
// Generates a business description from name, category, and active services.
exports.generateDescription = async (req, res) => {
  try {
    const { rows: services } = await db.query(
      'SELECT name FROM services WHERE business_id=$1 AND is_active=TRUE ORDER BY created_at LIMIT 8',
      [req.business.id]
    );
    const description = await generateBusinessDescription({
      businessName: req.business.name,
      category: req.business.category,
      services,
    });
    if (!description) return res.status(503).json({ error: 'AI not available' });
    res.json({ description });
  } catch (err) {
    console.error('[ai/generate-description]', err.message);
    res.status(500).json({ error: 'Failed to generate description' });
  }
};

// GET /api/ai/gap-suggestions (business-auth)
// Analyses upcoming booking gaps and returns actionable suggestions.
exports.gapSuggestions = async (req, res) => {
  try {
    const { rows: avRows } = await db.query(
      'SELECT opening_time, closing_time, slot_interval_minutes, working_days FROM availability_settings WHERE business_id=$1',
      [req.business.id]
    );
    if (!avRows.length) return res.json({ suggestion: null, reason: 'no_availability_settings' });
    const av = avRows[0];
    const slotInterval = av.slot_interval_minutes || 30;
    const openMin = timeToMinutes(av.opening_time || '09:00');
    const closeMin = timeToMinutes(av.closing_time || '18:00');
    const totalSlots = Math.floor((closeMin - openMin) / slotInterval);

    // Next 7 days
    const gaps = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()];
      const workingDays = av.working_days || [];
      if (!workingDays.includes(dayName)) continue;
      const { rows: booked } = await db.query(
        `SELECT COUNT(*) AS cnt FROM bookings WHERE business_id=$1 AND booking_date=$2 AND status NOT IN ('cancelled')`,
        [req.business.id, dateStr]
      );
      const bookedSlots = parseInt(booked[0]?.cnt || 0);
      const gapCount = Math.max(0, totalSlots - bookedSlots);
      if (gapCount > 0) gaps.push({ date: dateStr, day_name: d.toLocaleDateString('en-GB', { weekday: 'long' }), booked_slots: bookedSlots, total_slots: totalSlots, gap_count: gapCount });
    }

    const { rows: avgRows } = await db.query(
      `SELECT ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT booking_date), 0), 1) AS avg
       FROM bookings WHERE business_id=$1 AND status NOT IN ('cancelled') AND booking_date >= NOW() - INTERVAL '30 days'`,
      [req.business.id]
    );
    const avgBookingsPerDay = parseFloat(avgRows[0]?.avg || 0);

    if (!gaps.length) return res.json({ suggestion: null, gaps: [], reason: 'fully_booked' });

    const suggestion = await suggestGapFilling({
      businessName: req.business.name,
      category: req.business.category,
      gaps,
      avgBookingsPerDay,
    });
    res.json({ suggestion, gaps });
  } catch (err) {
    console.error('[ai/gap-suggestions]', err.message);
    res.status(500).json({ error: 'Failed to analyse gaps' });
  }
};

// GET /api/ai/reassign-suggestion/:bookingId (business-auth)
// Given a booking, returns the best available staff member to reassign it to.
exports.reassignSuggestion = async (req, res) => {
  try {
    const { rows: bRows } = await db.query(
      `SELECT b.booking_date, b.start_time, b.staff_member_id, s.name AS service_name, sm.name AS staff_name
       FROM bookings b
       LEFT JOIN services s ON s.id = b.service_id
       LEFT JOIN staff_members sm ON sm.id = b.staff_member_id
       WHERE b.id=$1 AND b.business_id=$2`,
      [req.params.bookingId, req.business.id]
    );
    if (!bRows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bRows[0];

    // Find active staff not already booked at this time (excluding current assignee)
    const { rows: staffRows } = await db.query(
      `SELECT sm.id, sm.name, sm.role,
              COUNT(b2.id) AS bookings_today
       FROM staff_members sm
       LEFT JOIN bookings b2 ON b2.staff_member_id = sm.id AND b2.booking_date = $1 AND b2.status NOT IN ('cancelled')
       WHERE sm.business_id = $2 AND sm.is_active = TRUE
         AND sm.id != $3
         AND sm.id NOT IN (
           SELECT staff_member_id FROM bookings
           WHERE business_id=$2 AND booking_date=$1 AND start_time=$4 AND status NOT IN ('cancelled') AND staff_member_id IS NOT NULL
         )
       GROUP BY sm.id`,
      [booking.booking_date, req.business.id, booking.staff_member_id || '00000000-0000-0000-0000-000000000000', booking.start_time]
    );

    if (!staffRows.length) return res.json({ suggestion: null, reason: 'no_available_staff' });

    const suggestion = await suggestStaffReassignment({
      serviceName: booking.service_name,
      originalStaffName: booking.staff_name,
      availableStaff: staffRows,
      bookingDate: booking.booking_date,
      bookingTime: booking.start_time,
    });
    res.json({ suggestion, available: staffRows });
  } catch (err) {
    console.error('[ai/reassign-suggestion]', err.message);
    res.status(500).json({ error: 'Failed to get reassignment suggestion' });
  }
};

// POST /api/ai/personalise-message (business-auth)
// Returns a personalised re-engagement message for one lapsed customer.
exports.personaliseMessage = async (req, res) => {
  try {
    const { customer_name, last_service_name, days_since } = req.body;
    const { rows: services } = await db.query(
      'SELECT name FROM services WHERE business_id=$1 AND is_active=TRUE LIMIT 3',
      [req.business.id]
    );
    const message = await personaliseReEngagement({
      businessName: req.business.name,
      category: req.business.category,
      customerName: customer_name,
      lastServiceName: last_service_name,
      daysSince: days_since,
      servicesAvailable: services,
    });
    if (!message) return res.status(503).json({ error: 'AI not available' });
    res.json({ message });
  } catch (err) {
    console.error('[ai/personalise-message]', err.message);
    res.status(500).json({ error: 'Failed to personalise message' });
  }
};

function timeToMinutes(t) {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}
