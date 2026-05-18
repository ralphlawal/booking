const db = require('../config/database');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeToMin(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function generateSlots({ openingTime, closingTime, slotInterval, buffer, duration, existingBookings, blockedSlots, timeWindow }) {
  const slots = [];
  const open = timeToMin(openingTime);
  const close = timeToMin(closingTime);
  const winStart = timeToMin(timeWindow.start);
  const winEnd = timeToMin(timeWindow.end);

  let cur = open;
  while (cur + duration <= close) {
    const end = cur + duration;
    if (cur >= winStart && cur < winEnd) {
      const busy =
        existingBookings.some((b) => {
          const bs = timeToMin(b.start_time);
          const be = timeToMin(b.end_time);
          return cur < be + buffer && end > bs;
        }) ||
        blockedSlots.some((b) => {
          if (!b.start_time) return false;
          const bs = timeToMin(b.start_time);
          const be = timeToMin(b.end_time);
          return cur < be && end > bs;
        });
      if (!busy) {
        const fmt = (m) =>
          `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
        slots.push({ start: fmt(cur), end: fmt(end) });
      }
    }
    cur += slotInterval;
  }
  return slots;
}

const TIME_WINDOWS = {
  morning:   { start: '06:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening:   { start: '17:00', end: '22:00' },
  any:       { start: '00:00', end: '23:59' },
};

// GET /api/discover?q=&category=&lat=&lng=&page=&limit=
exports.search = async (req, res) => {
  try {
    const { q, category, lat, lng, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let query = `
      SELECT b.id, b.name, b.slug, b.description, b.category, b.location,
             b.logo_url, b.phone, b.email, b.latitude, b.longitude,
             COUNT(DISTINCT s.id) AS service_count,
             MIN(s.price)::FLOAT        AS min_price,
             MAX(s.price)::FLOAT        AS max_price,
             COALESCE(AVG(r.rating), 0)::FLOAT AS avg_rating,
             COUNT(DISTINCT r.id)       AS review_count
      FROM businesses b
      LEFT JOIN services s ON s.business_id = b.id AND s.is_active = TRUE
      LEFT JOIN reviews  r ON r.business_id = b.id
      WHERE b.is_active = TRUE
    `;
    const params = [];
    let idx = 1;

    if (q) {
      query += ` AND (b.name ILIKE $${idx} OR b.description ILIKE $${idx} OR b.category ILIKE $${idx})`;
      params.push(`%${q}%`);
      idx++;
    }
    if (category && category !== 'all') {
      query += ` AND b.category ILIKE $${idx}`;
      params.push(`%${category}%`);
      idx++;
    }

    query += ` GROUP BY b.id ORDER BY avg_rating DESC, b.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), offset);

    const { rows } = await db.query(query, params);

    let results = rows;
    if (lat && lng) {
      const uLat = parseFloat(lat);
      const uLng = parseFloat(lng);
      results = rows
        .map((b) => ({
          ...b,
          distance_km: b.latitude && b.longitude
            ? Math.round(haversineKm(uLat, uLng, b.latitude, b.longitude) * 10) / 10
            : null,
        }))
        .sort((a, b) => {
          if (a.distance_km === null && b.distance_km === null) return 0;
          if (a.distance_km === null) return 1;
          if (b.distance_km === null) return -1;
          return a.distance_km - b.distance_km;
        });
    }

    res.json(results);
  } catch (err) {
    console.error('[discover/search]', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
};

// GET /api/discover/categories
exports.categories = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT category, COUNT(*) AS count FROM businesses
       WHERE is_active = TRUE AND category IS NOT NULL
       GROUP BY category ORDER BY count DESC LIMIT 30`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

// GET /api/discover/match?service_type=&date=&time_pref=&lat=&lng=
exports.smartMatch = async (req, res) => {
  try {
    const { service_type, date, time_pref = 'any', lat, lng } = req.query;
    if (!service_type) return res.status(400).json({ error: 'service_type is required' });

    const targetDate = date || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    const window = TIME_WINDOWS[time_pref] || TIME_WINDOWS.any;
    const dayName = new Date(targetDate + 'T12:00:00Z')
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      .toLowerCase();

    // Businesses + matching services
    const { rows: bizRows } = await db.query(
      `SELECT b.id AS business_id, b.name AS business_name, b.slug, b.description, b.category,
              b.location, b.logo_url, b.phone, b.latitude, b.longitude,
              s.id AS service_id, s.name AS service_name, s.price::FLOAT AS price,
              s.duration_minutes, s.deposit_required, s.deposit_amount::FLOAT AS deposit_amount,
              COALESCE(AVG(r.rating), 0)::FLOAT AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM businesses b
       JOIN services s ON s.business_id = b.id AND s.is_active = TRUE
       LEFT JOIN reviews r ON r.business_id = b.id
       WHERE b.is_active = TRUE
         AND (s.name ILIKE $1 OR b.category ILIKE $1 OR b.description ILIKE $1)
       GROUP BY b.id, s.id
       ORDER BY avg_rating DESC`,
      [`%${service_type}%`]
    );

    if (!bizRows.length) return res.json([]);

    const matches = [];
    const seen = new Set();

    for (const row of bizRows) {
      const key = `${row.business_id}-${row.service_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const { rows: avRows } = await db.query(
          'SELECT * FROM availability_settings WHERE business_id = $1',
          [row.business_id]
        );
        if (!avRows.length) continue;
        const av = avRows[0];

        const workingDays = av.working_days || [];
        if (!workingDays.includes(dayName)) continue;

        const { rows: existingBookings } = await db.query(
          `SELECT start_time, end_time FROM bookings
           WHERE business_id = $1 AND booking_date = $2 AND status NOT IN ('cancelled')`,
          [row.business_id, targetDate]
        );

        const { rows: blockedRows } = await db.query(
          'SELECT * FROM blocked_slots WHERE business_id = $1 AND blocked_date = $2',
          [row.business_id, targetDate]
        );
        if (blockedRows.some((b) => b.is_full_day)) continue;

        const slots = generateSlots({
          openingTime: av.opening_time,
          closingTime: av.closing_time,
          slotInterval: av.slot_interval_minutes || 30,
          buffer: av.buffer_minutes || 0,
          duration: row.duration_minutes,
          existingBookings,
          blockedSlots: blockedRows,
          timeWindow: window,
        });

        if (!slots.length) continue;

        const distance =
          lat && lng && row.latitude && row.longitude
            ? Math.round(haversineKm(parseFloat(lat), parseFloat(lng), row.latitude, row.longitude) * 10) / 10
            : null;

        matches.push({
          business_id: row.business_id,
          business_name: row.business_name,
          slug: row.slug,
          description: row.description,
          category: row.category,
          location: row.location,
          logo_url: row.logo_url,
          phone: row.phone,
          latitude: row.latitude,
          longitude: row.longitude,
          avg_rating: parseFloat(row.avg_rating).toFixed(1),
          review_count: parseInt(row.review_count),
          service_id: row.service_id,
          service_name: row.service_name,
          price: row.price,
          duration_minutes: row.duration_minutes,
          deposit_required: row.deposit_required,
          deposit_amount: row.deposit_amount,
          available_slots: slots.slice(0, 5),
          earliest_slot: slots[0],
          slot_count: slots.length,
          date: targetDate,
          distance_km: distance,
        });
      } catch (err) {
        console.error(`[smart-match] biz ${row.business_id}:`, err.message);
      }
    }

    // Rank: by distance → available slots → cheapest price
    matches.sort((a, b) => {
      const dDist = (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
      if (Math.abs(dDist) > 2) return dDist;
      if (b.slot_count !== a.slot_count) return b.slot_count - a.slot_count;
      return a.price - b.price;
    });

    res.json(matches.slice(0, 10));
  } catch (err) {
    console.error('[discover/match]', err.message);
    res.status(500).json({ error: 'Match failed' });
  }
};
