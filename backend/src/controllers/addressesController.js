const db = require('../config/database');

const ALLOWED = ['nickname', 'address_line', 'city', 'postcode', 'country', 'travel_radius_km', 'travel_charge', 'is_primary'];

// GET /business/me/addresses
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM business_addresses WHERE business_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /business/me/addresses
exports.create = async (req, res) => {
  try {
    const { nickname, address_line, city, postcode, country, travel_radius_km, travel_charge, is_primary } = req.body;
    if (!address_line) return res.status(400).json({ error: 'address_line is required' });

    // If new address is marked primary, demote existing primary first
    if (is_primary) {
      await db.query(
        'UPDATE business_addresses SET is_primary = FALSE WHERE business_id = $1',
        [req.business.id]
      );
    }

    const { rows } = await db.query(
      `INSERT INTO business_addresses
         (business_id, nickname, address_line, city, postcode, country, travel_radius_km, travel_charge, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.business.id,
        nickname || 'Location',
        address_line,
        city || null,
        postcode || null,
        country || 'GB',
        travel_radius_km || null,
        travel_charge || null,
        !!is_primary,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /business/me/addresses/:id
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Verify ownership
    const check = await db.query(
      'SELECT id FROM business_addresses WHERE id = $1 AND business_id = $2',
      [id, req.business.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Address not found' });

    // If setting as primary, demote others first
    if (req.body.is_primary) {
      await db.query(
        'UPDATE business_addresses SET is_primary = FALSE WHERE business_id = $1 AND id != $2',
        [req.business.id, id]
      );
    }

    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of ALLOWED) {
      if (key in req.body) {
        sets.push(`${key} = $${i++}`);
        vals.push(req.body[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const { rows } = await db.query(
      `UPDATE business_addresses SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /business/me/addresses/:id
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rowCount } = await db.query(
      'DELETE FROM business_addresses WHERE id = $1 AND business_id = $2',
      [id, req.business.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Address not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /business/:slug/addresses  (public — for booking page)
exports.listPublic = async (req, res) => {
  try {
    const bizRow = await db.query('SELECT id FROM businesses WHERE slug = $1', [req.params.slug]);
    if (!bizRow.rows.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      'SELECT id, nickname, address_line, city, postcode, latitude, longitude, travel_radius_km, travel_charge, is_primary FROM business_addresses WHERE business_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [bizRow.rows[0].id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
