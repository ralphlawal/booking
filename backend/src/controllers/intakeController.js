const db = require('../config/database');
const crypto = require('crypto');

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeForm(row) {
  if (!row) return null;
  return {
    ...row,
    questions: parseJson(row.questions, []),
    is_active: !!row.is_active,
  };
}

function normalizeResponse(row) {
  if (!row) return row;
  return {
    ...row,
    responses: parseJson(row.responses, {}),
  };
}

// GET /api/intake  — business gets their active intake form
exports.get = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM intake_forms WHERE business_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.business.id]
    );
    res.json(normalizeForm(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load intake form' });
  }
};

// GET /api/intake/public/:slug — public: get intake form for booking flow
exports.getPublic = async (req, res) => {
  try {
    const { rows: biz } = await db.query('SELECT id FROM businesses WHERE slug=$1', [req.params.slug]);
    if (!biz.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      'SELECT * FROM intake_forms WHERE business_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1',
      [biz[0].id]
    );
    res.json(normalizeForm(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load intake form' });
  }
};

// PUT /api/intake  — business saves/updates their intake form
exports.save = async (req, res) => {
  try {
    const { title, questions, is_active } = req.body;
    // Upsert — each business has at most one active form
    const { rows: existing } = await db.query(
      'SELECT id FROM intake_forms WHERE business_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.business.id]
    );
    if (existing.length) {
      const { rows } = await db.query(
        `UPDATE intake_forms SET title=COALESCE($1,title), questions=COALESCE($2,questions), is_active=COALESCE($3,is_active)
         WHERE id=$4 RETURNING *`,
        [title||null, questions ? JSON.stringify(questions) : null, is_active??null, existing[0].id]
      );
      return res.json(normalizeForm(rows[0]));
    }
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO intake_forms (id, business_id, title, questions, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, req.business.id, title||'Pre-appointment form', JSON.stringify(questions||[]), is_active??true]
    );
    res.status(201).json(normalizeForm(rows[0]));
  } catch (err) {
    console.error('[intake/save]', err.message);
    res.status(500).json({ error: 'Failed to save intake form' });
  }
};

// GET /api/intake/responses  — business views intake responses
exports.listResponses = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ir.*, b.reference_id, b.booking_date, b.start_time
       FROM intake_responses ir
       JOIN intake_forms f ON f.id = ir.intake_form_id
       LEFT JOIN bookings b ON b.id = ir.booking_id
       WHERE f.business_id=$1
       ORDER BY ir.created_at DESC LIMIT 100`,
      [req.business.id]
    );
    res.json(rows.map(normalizeResponse));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load responses' });
  }
};

// POST /api/intake/respond  — submit intake response before booking (public)
exports.respond = async (req, res) => {
  try {
    const { intake_form_id, consumer_name, responses } = req.body;
    if (!intake_form_id) return res.status(400).json({ error: 'intake_form_id is required' });
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO intake_responses (id, intake_form_id, consumer_name, responses)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [id, intake_form_id, consumer_name||null, JSON.stringify(responses||{})]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('[intake/respond]', err.message);
    res.status(500).json({ error: 'Failed to save intake response' });
  }
};
