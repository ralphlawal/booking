const db = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function normalizeConsumer(row) {
  if (!row) return null;
  const normalized = { ...row };
  if (typeof normalized.service_preferences === 'string') {
    try {
      normalized.service_preferences = JSON.parse(normalized.service_preferences);
    } catch {
      normalized.service_preferences = [];
    }
  }
  normalized.email_verified = !!normalized.email_verified;
  normalized.onboarding_complete = !!normalized.onboarding_complete;
  return normalized;
}

function isMissingRelationError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return err?.code === '42p01'
    || msg.includes('no such table')
    || msg.includes('does not exist')
    || msg.includes('no such column');
}

const ConsumerAccount = {
  async create({ email, password, full_name, phone }) {
    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO consumer_accounts (id, email, password_hash, full_name, phone)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, full_name, phone, avatar_url, created_at, FALSE AS email_verified`,
      [id, email.toLowerCase().trim(), password_hash, full_name.trim(), phone || null]
    );
    return normalizeConsumer(rows[0]);
  },

  async createFromGoogle({ email, full_name }) {
    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const { rows } = await db.query(
      `INSERT INTO consumer_accounts (id, email, password_hash, full_name, email_verified)
       VALUES ($1,$2,$3,$4,TRUE)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, full_name, phone, avatar_url, created_at, TRUE AS email_verified`,
      [id, email.toLowerCase().trim(), password_hash, (full_name || email.split('@')[0]).trim()]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await db.query(
      'SELECT * FROM consumer_accounts WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return normalizeConsumer(rows[0]);
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT id, email, full_name, phone, avatar_url, created_at,
              COALESCE(email_verified, FALSE) AS email_verified,
              location_text, latitude, longitude,
              COALESCE(service_preferences, '[]'::jsonb) AS service_preferences,
              COALESCE(onboarding_complete, FALSE) AS onboarding_complete
       FROM consumer_accounts WHERE id = $1`,
      [id]
    );
    return normalizeConsumer(rows[0]);
  },

  async update(id, fields) {
    const allowed = ['full_name', 'phone', 'avatar_url', 'location_text', 'latitude', 'longitude', 'service_preferences', 'onboarding_complete'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        // service_preferences must be stored as JSON string for JSONB
        values.push(key === 'service_preferences' && Array.isArray(fields[key]) ? JSON.stringify(fields[key]) : fields[key]);
      }
    }
    if (!updates.length) return ConsumerAccount.findById(id);
    updates.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await db.query(
      `UPDATE consumer_accounts SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, email, full_name, phone, avatar_url,
                 location_text, latitude, longitude,
                 COALESCE(service_preferences, '[]'::jsonb) AS service_preferences,
                 COALESCE(onboarding_complete, FALSE) AS onboarding_complete`,
      values
    );
    return normalizeConsumer(rows[0]);
  },

  async getBookings(consumer_id, consumer_email) {
    // Match bookings by consumer_id OR by email (guest bookings made without logging in)
    const emailClause = consumer_email
      ? `AND (b.consumer_id = $1 OR (b.consumer_id IS NULL AND c2.email = $2))`
      : `AND b.consumer_id = $1`;
    const params = consumer_email ? [consumer_id, consumer_email] : [consumer_id];

    const fullQuery = `SELECT b.id, b.reference_id, b.booking_date, b.start_time, b.end_time, b.status,
            b.notes, b.cancelled_reason, b.created_at,
            b.payment_status, b.stripe_payment_intent_id,
            biz.name AS business_name, biz.slug, biz.logo_url, biz.category, biz.location, biz.phone AS business_phone,
            s.name AS service_name, s.price, s.duration_minutes,
            s.id AS service_id, biz.id AS business_id,
            (rv.id IS NOT NULL) AS reviewed,
            (sc.id IS NOT NULL) AS service_confirmed,
            (d.id IS NOT NULL) AS has_dispute,
            d.status AS dispute_status
     FROM bookings b
     JOIN businesses biz ON biz.id = b.business_id
     JOIN services s ON s.id = b.service_id
     JOIN customers c2 ON c2.id = b.customer_id
     LEFT JOIN reviews rv ON rv.booking_id = b.id
     LEFT JOIN service_confirmations sc ON sc.booking_id = b.id
     LEFT JOIN disputes d ON d.booking_id = b.id
     WHERE 1=1 ${emailClause}
     ORDER BY b.booking_date DESC, b.start_time DESC`;

    const fallbackQuery = `SELECT b.id, b.reference_id, b.booking_date, b.start_time, b.end_time, b.status,
            b.notes, b.cancelled_reason, b.created_at,
            b.payment_status, b.stripe_payment_intent_id,
            biz.name AS business_name, biz.slug, biz.logo_url, biz.category, biz.location, biz.phone AS business_phone,
            s.name AS service_name, s.price, s.duration_minutes,
            s.id AS service_id, biz.id AS business_id,
            FALSE AS reviewed,
            FALSE AS service_confirmed,
            FALSE AS has_dispute,
            NULL AS dispute_status
     FROM bookings b
     JOIN businesses biz ON biz.id = b.business_id
     JOIN services s ON s.id = b.service_id
     JOIN customers c2 ON c2.id = b.customer_id
     WHERE 1=1 ${emailClause}
     ORDER BY b.booking_date DESC, b.start_time DESC`;

    try {
      const { rows } = await db.query(fullQuery, params);
      return rows;
    } catch (err) {
      if (!isMissingRelationError(err)) throw err;
      console.warn('[consumer bookings] Falling back without trust/dispute joins:', err.message);
      const { rows } = await db.query(fallbackQuery, params);
      return rows;
    }
  },

  async getPreferences(consumer_id) {
    const { rows } = await db.query(
      `SELECT cp.id, cp.business_id, cp.service_id, cp.notes, cp.last_booked_at, cp.total_bookings,
              biz.name AS business_name, biz.slug, biz.logo_url, biz.category, biz.location,
              s.name AS service_name, s.price, s.duration_minutes
       FROM consumer_preferences cp
       JOIN businesses biz ON biz.id = cp.business_id
       LEFT JOIN services s ON s.id = cp.service_id
       WHERE cp.consumer_id = $1
       ORDER BY cp.last_booked_at DESC NULLS LAST`,
      [consumer_id]
    );
    return rows;
  },

  async upsertPreference({ consumer_id, business_id, service_id, notes }) {
    const id = crypto.randomUUID();
    const { rows } = await db.query(
      `INSERT INTO consumer_preferences (id, consumer_id, business_id, service_id, notes, last_booked_at, total_bookings)
       VALUES ($1,$2,$3,$4,$5,NOW(),1)
       ON CONFLICT (consumer_id, business_id) DO UPDATE SET
         service_id = COALESCE(EXCLUDED.service_id, consumer_preferences.service_id),
         notes = COALESCE(EXCLUDED.notes, consumer_preferences.notes),
         last_booked_at = NOW(),
         total_bookings = consumer_preferences.total_bookings + 1
       RETURNING *`,
      [id, consumer_id, business_id, service_id || null, notes || null]
    );
    return rows[0];
  },

  async removePreference(consumer_id, business_id) {
    await db.query(
      'DELETE FROM consumer_preferences WHERE consumer_id = $1 AND business_id = $2',
      [consumer_id, business_id]
    );
  },

  async getFamilyMembers(consumer_id) {
    const { rows } = await db.query(
      `SELECT id, full_name, relationship, phone, notes, created_at, updated_at
       FROM consumer_family_members
       WHERE consumer_id = $1
       ORDER BY created_at DESC`,
      [consumer_id]
    );
    return rows;
  },

  async addFamilyMember(consumer_id, fields) {
    const id = crypto.randomUUID();
    const { full_name, relationship, phone, notes } = fields;
    const { rows } = await db.query(
      `INSERT INTO consumer_family_members (id, consumer_id, full_name, relationship, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, relationship, phone, notes, created_at, updated_at`,
      [id, consumer_id, full_name.trim(), relationship || null, phone || null, notes || null]
    );
    return rows[0];
  },

  async updateFamilyMember(consumer_id, id, fields) {
    const { full_name, relationship, phone, notes } = fields;
    const { rows } = await db.query(
      `UPDATE consumer_family_members
       SET full_name = COALESCE($1, full_name),
           relationship = COALESCE($2, relationship),
           phone = COALESCE($3, phone),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5 AND consumer_id = $6
       RETURNING id, full_name, relationship, phone, notes, created_at, updated_at`,
      [
        full_name === undefined ? null : full_name.trim(),
        relationship === undefined ? null : relationship,
        phone === undefined ? null : phone,
        notes === undefined ? null : notes,
        id,
        consumer_id,
      ]
    );
    return rows[0] || null;
  },

  async deleteFamilyMember(consumer_id, id) {
    const { rowCount } = await db.query(
      'DELETE FROM consumer_family_members WHERE id = $1 AND consumer_id = $2',
      [id, consumer_id]
    );
    return rowCount > 0;
  },

  async getLoyaltySummary(consumer_id, consumer_email) {
    const bookings = await this.getBookings(consumer_id, consumer_email);
    const completed = bookings.filter((booking) => booking.status === 'completed' || booking.service_confirmed);
    const paid = bookings.filter((booking) => booking.payment_status === 'paid');
    const businessMap = new Map();

    for (const booking of bookings) {
      if (!booking.business_id) continue;
      const current = businessMap.get(booking.business_id) || {
        business_id: booking.business_id,
        business_name: booking.business_name,
        slug: booking.slug,
        logo_url: booking.logo_url,
        category: booking.category,
        visits: 0,
        completed: 0,
        last_booking_at: null,
        last_service_name: null,
        service_id: null,
      };
      current.visits += 1;
      if (booking.status === 'completed' || booking.service_confirmed) current.completed += 1;
      const key = String(booking.booking_date || booking.created_at || '');
      if (!current.last_booking_at || key > String(current.last_booking_at)) {
        current.last_booking_at = booking.booking_date || booking.created_at;
        current.last_service_name = booking.service_name;
        current.service_id = booking.service_id;
      }
      businessMap.set(booking.business_id, current);
    }

    const total_spend = paid.reduce((sum, booking) => sum + Number(booking.price || 0), 0);
    const stamps = Math.min(completed.length, 10);
    const next_milestone = stamps >= 10 ? 10 : Math.ceil((stamps + 1) / 5) * 5;

    return {
      total_bookings: bookings.length,
      completed_bookings: completed.length,
      paid_bookings: paid.length,
      total_spend,
      stamps,
      next_milestone,
      credits: 0,
      top_businesses: [...businessMap.values()]
        .sort((a, b) => b.visits - a.visits || b.completed - a.completed)
        .slice(0, 5),
    };
  },

  async setResetToken(email, token, expiresAt) {
    const { rows } = await db.query(
      `UPDATE consumer_accounts SET reset_token = $1, reset_token_expires = $2
       WHERE email = $3 RETURNING id`,
      [token, expiresAt, email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  async findByResetToken(token) {
    const { rows } = await db.query(
      `SELECT id, email, reset_token_expires FROM consumer_accounts
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );
    return rows[0] || null;
  },

  async updatePassword(id, newPasswordHash) {
    await db.query(
      `UPDATE consumer_accounts SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, id]
    );
  },

  async changeEmail(id, newEmail) {
    const { rows } = await db.query(
      `UPDATE consumer_accounts SET email = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, email, full_name, phone, avatar_url`,
      [newEmail.toLowerCase().trim(), id]
    );
    return rows[0] || null;
  },

  async linkByEmail(consumer_id, email) {
    // Find all customers with this email and link their bookings to this consumer
    const { rows: customers } = await db.query(
      'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (!customers.length) return 0;
    const customerIds = customers.map(c => c.id);
    const placeholders = customerIds.map((_, i) => `$${i + 2}`).join(', ');
    const { rowCount } = await db.query(
      `UPDATE bookings SET consumer_id = $1
       WHERE customer_id IN (${placeholders}) AND consumer_id IS NULL`,
      [consumer_id, ...customerIds]
    );
    return rowCount;
  },

  async saveVerifyToken(id, token) {
    await db.query(
      'UPDATE consumer_accounts SET email_verified = FALSE, email_verify_token = $1 WHERE id = $2',
      [token, id]
    );
  },

  async findByVerifyToken(token) {
    const { rows } = await db.query(
      'SELECT * FROM consumer_accounts WHERE email_verify_token = $1',
      [token]
    );
    return rows[0] || null;
  },

  async markEmailVerified(id) {
    await db.query(
      'UPDATE consumer_accounts SET email_verified = TRUE, email_verify_token = NULL WHERE id = $1',
      [id]
    );
  },

  async deleteById(id) {
    // Preserve booking records for the business by nullifying consumer link
    await db.query('UPDATE bookings SET consumer_id = NULL WHERE consumer_id = $1', [id]);
    await db.query('DELETE FROM consumer_preferences WHERE consumer_id = $1', [id]);
    await db.query('DELETE FROM consumer_family_members WHERE consumer_id = $1', [id]).catch(() => {});
    await db.query('DELETE FROM consumer_accounts WHERE id = $1', [id]);
  },
};

module.exports = ConsumerAccount;
