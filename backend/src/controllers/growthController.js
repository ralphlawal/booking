const db = require('../config/database');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');
const { sendSms } = require('../services/smsService');
const pushService = require('../services/pushService');
const Notification = require('../models/Notification');

/* ── helpers ─────────────────────────────────────────────────────────────── */

const isPostgres = process.env.DATABASE_URL?.includes('postgres');

// Which channels are actually configured (honest status)
function channelStatus() {
  return {
    email: true, // Resend is always configured via env
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    push: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    in_app: true, // always works via notification system
    whatsapp: false, // not integrated yet
  };
}

// Resolve audience filter → list of customers with contact details
async function resolveAudience(businessId, audience) {
  let whereExtra = '';
  if (audience === 'new') {
    whereExtra = `AND c.total_visits <= 1`;
  } else if (audience === 'returning') {
    whereExtra = `AND c.total_visits > 1`;
  } else if (audience === 'vip') {
    // Top 10% by spend — approximate with > avg
    whereExtra = `AND c.lifetime_spend > (SELECT AVG(lifetime_spend) FROM customers WHERE business_id = $1 AND lifetime_spend > 0)`;
  } else if (audience === 'inactive_30') {
    whereExtra = `AND c.last_visit < NOW() - INTERVAL '30 days'`;
  } else if (audience === 'inactive_60') {
    whereExtra = `AND c.last_visit < NOW() - INTERVAL '60 days'`;
  } else if (audience === 'at_risk') {
    // Visited 2+ times but not in 45 days
    whereExtra = `AND c.total_visits >= 2 AND c.last_visit < NOW() - INTERVAL '45 days'`;
  }
  // audience === 'all': no extra filter

  if (isPostgres) {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (COALESCE(b.customer_email, c.email))
              c.id, c.name, c.email, c.phone,
              b.customer_email AS booking_email,
              b.customer_phone AS booking_phone,
              b.consumer_id
       FROM customers c
       LEFT JOIN bookings b ON b.business_id = c.business_id
         AND (b.customer_email IS NOT NULL OR b.consumer_id IS NOT NULL)
         AND b.id = (
           SELECT id FROM bookings b2 WHERE b2.business_id = c.business_id
             AND (b2.customer_email = c.email OR b2.customer_phone = c.phone)
           ORDER BY b2.created_at DESC LIMIT 1
         )
       WHERE c.business_id = $1 ${whereExtra}
       ORDER BY COALESCE(b.customer_email, c.email), c.last_visit DESC NULLS LAST
       LIMIT 2000`,
      [businessId]
    );
    return rows;
  } else {
    // SQLite fallback
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.email, c.phone,
              (SELECT b.customer_email FROM bookings b
               WHERE b.business_id = c.business_id
                 AND (b.customer_email IS NOT NULL OR b.consumer_id IS NOT NULL)
               ORDER BY b.created_at DESC LIMIT 1) AS booking_email,
              (SELECT b.consumer_id FROM bookings b
               WHERE b.business_id = c.business_id
               ORDER BY b.created_at DESC LIMIT 1) AS consumer_id
       FROM customers c WHERE c.business_id = ?
       LIMIT 2000`,
      [businessId]
    );
    return rows;
  }
}

// Send one campaign message to one recipient
async function sendOne(channel, recipient, { subject, message, bookingLink, businessName }) {
  const email = recipient.booking_email || recipient.email;
  const phone = recipient.booking_phone || recipient.phone;
  const name = recipient.name || 'there';

  const personalised = message
    .replace(/\{name\}/gi, name)
    .replace(/\{business\}/gi, businessName)
    .replace(/\{link\}/gi, bookingLink || '');

  if (channel === 'email' && email) {
    await sendEmail({
      to: email,
      subject: subject || `Message from ${businessName}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <p>Hi ${name},</p>
        <p>${personalised.replace(/\n/g, '<br/>')}</p>
        ${bookingLink ? `<p><a href="${bookingLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px">Book Now</a></p>` : ''}
        <p style="color:#999;font-size:12px;margin-top:24px">Sent via BookAm · <a href="#">Unsubscribe</a></p>
      </div>`,
    });
    return { status: 'sent', channel: 'email', to: email };
  }

  if (channel === 'sms' && phone) {
    await sendSms(phone, `${personalised}${bookingLink ? `\n\nBook: ${bookingLink}` : ''}`);
    return { status: 'sent', channel: 'sms', to: phone };
  }

  if (channel === 'in_app' && recipient.consumer_id) {
    await Notification.createForUser(recipient.consumer_id, {
      type: 'marketing',
      title: subject || businessName,
      body: personalised.slice(0, 200),
      link: bookingLink || '/customer/dashboard',
    }).catch(() => {});
    return { status: 'sent', channel: 'in_app', to: recipient.consumer_id };
  }

  if (channel === 'push' && recipient.consumer_id) {
    const tokens = await pushService.getTokens('consumer', recipient.consumer_id).catch(() => []);
    if (tokens.length) await pushService.sendPush(tokens, { title: subject || businessName, body: personalised.slice(0, 150) });
    return { status: 'sent', channel: 'push', to: recipient.consumer_id };
  }

  return null; // no valid contact for this channel
}

/* ── exports ─────────────────────────────────────────────────────────────── */

// GET /api/growth/integrations
exports.integrations = (req, res) => {
  res.json(channelStatus());
};

// GET /api/growth/intelligence
exports.intelligence = async (req, res) => {
  try {
    const bizId = req.business.id;
    const slug = req.business.slug;
    const frontendUrl = process.env.FRONTEND_URL || 'https://bookam.business';
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const insights = [];

    if (isPostgres) {
      // Customers due this week (based on avg booking frequency)
      const { rows: due } = await db.query(
        `WITH freq AS (
           SELECT c.id, c.name,
                  COUNT(b.id) AS visits,
                  MAX(b.booking_date) AS last_date,
                  CASE WHEN COUNT(b.id) > 1
                    THEN EXTRACT(DAY FROM MAX(b.booking_date::timestamp) - MIN(b.booking_date::timestamp)) / NULLIF(COUNT(b.id)-1,0)
                    ELSE NULL END AS avg_interval_days
           FROM customers c
           JOIN bookings b ON b.business_id = c.business_id
             AND (b.customer_email = c.email OR b.customer_phone = c.phone)
             AND b.status = 'completed'
           WHERE c.business_id = $1
           GROUP BY c.id, c.name
         )
         SELECT id, name, last_date, ROUND(avg_interval_days) AS avg_interval_days,
                (last_date + (avg_interval_days || ' days')::interval)::date AS next_due
         FROM freq
         WHERE avg_interval_days IS NOT NULL
           AND (last_date + (avg_interval_days || ' days')::interval)::date
               BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
         LIMIT 50`,
        [bizId]
      );
      if (due.length > 0) {
        insights.push({
          type: 'retention_due',
          icon: '🔁',
          title: `${due.length} customer${due.length > 1 ? 's' : ''} due this week`,
          description: `Based on their booking frequency, these customers are ready for their next visit.`,
          count: due.length,
          audience: 'retention_due',
          action: 'Send reminder',
          priority: 'high',
          suggestedMessage: `Hi {name}, you're due for your next appointment at {business}! Book now and we'll take care of you. {link}`,
        });
      }

      // Inactive 30+ days
      const { rows: inactive } = await db.query(
        `SELECT COUNT(*) AS cnt FROM customers c
         WHERE c.business_id = $1
           AND c.last_visit < NOW() - INTERVAL '30 days'
           AND c.total_visits >= 1`,
        [bizId]
      );
      const inactiveCount = parseInt(inactive[0]?.cnt || 0);
      if (inactiveCount > 0) {
        insights.push({
          type: 'inactive_30',
          icon: '😴',
          title: `${inactiveCount} customer${inactiveCount > 1 ? 's' : ''} haven't booked in 30+ days`,
          description: `Win them back before they forget about you.`,
          count: inactiveCount,
          audience: 'inactive_30',
          action: 'Create win-back campaign',
          priority: 'medium',
          suggestedMessage: `Hi {name}, we miss you at {business}! It's been a while — come back and treat yourself. Book now: {link}`,
        });
      }

      // Empty slots tomorrow
      const { rows: avail } = await db.query(
        `SELECT opening_time, closing_time, slot_interval_minutes, buffer_minutes
         FROM availability_settings WHERE business_id = $1 LIMIT 1`,
        [bizId]
      );
      if (avail[0]?.opening_time) {
        const { rows: booked } = await db.query(
          `SELECT COUNT(*) AS cnt FROM bookings
           WHERE business_id = $1 AND booking_date = $2
             AND status NOT IN ('cancelled','no_show')`,
          [bizId, tomorrow]
        );
        const av = avail[0];
        const [oh, om] = av.opening_time.split(':').map(Number);
        const [ch, cm] = av.closing_time.split(':').map(Number);
        const totalMins = (ch * 60 + cm) - (oh * 60 + om);
        const interval = parseInt(av.slot_interval_minutes) || 30;
        const totalSlots = Math.floor(totalMins / interval);
        const bookedCount = parseInt(booked[0]?.cnt || 0);
        const emptySlots = Math.max(0, totalSlots - bookedCount);
        if (emptySlots >= 3) {
          insights.push({
            type: 'empty_slots',
            icon: '📅',
            title: `${emptySlots} empty slot${emptySlots > 1 ? 's' : ''} tomorrow`,
            description: `Fill them with a last-minute promotion to existing customers.`,
            count: emptySlots,
            audience: 'all',
            action: 'Create promotion',
            priority: 'high',
            suggestedMessage: `Hi {name}, we have special availability tomorrow at {business}. Book now for a limited offer! {link}`,
          });
        }
      }

      // At-risk regular customers
      const { rows: atRisk } = await db.query(
        `SELECT COUNT(*) AS cnt FROM customers c
         WHERE c.business_id = $1
           AND c.total_visits >= 3
           AND c.last_visit < NOW() - INTERVAL '45 days'`,
        [bizId]
      );
      const atRiskCount = parseInt(atRisk[0]?.cnt || 0);
      if (atRiskCount > 0) {
        insights.push({
          type: 'at_risk',
          icon: '⚠️',
          title: `${atRiskCount} loyal customer${atRiskCount > 1 ? 's' : ''} at risk`,
          description: `These regulars haven't returned in 45+ days — act now before they leave permanently.`,
          count: atRiskCount,
          audience: 'at_risk',
          action: 'Send VIP offer',
          priority: 'high',
          suggestedMessage: `Hi {name}, as one of our most valued customers at {business}, we have a special offer just for you. Book now: {link}`,
        });
      }

      // Revenue snapshot
      const { rows: revSnap } = await db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN DATE_TRUNC('month', booking_date::timestamp) = DATE_TRUNC('month', NOW()) THEN price END), 0) AS this_month,
           COALESCE(SUM(CASE WHEN DATE_TRUNC('month', booking_date::timestamp) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN price END), 0) AS last_month,
           COUNT(CASE WHEN booking_date::date >= CURRENT_DATE - 7 AND status = 'confirmed' THEN 1 END) AS bookings_7d
         FROM bookings WHERE business_id = $1 AND status NOT IN ('cancelled','no_show')`,
        [bizId]
      );
      const rev = revSnap[0] || {};

      res.json({
        insights,
        snapshot: {
          revenue_this_month: parseFloat(rev.this_month || 0),
          revenue_last_month: parseFloat(rev.last_month || 0),
          bookings_7d: parseInt(rev.bookings_7d || 0),
        },
        booking_link: `${frontendUrl}/book/${slug}`,
      });
    } else {
      // SQLite: simplified insights
      res.json({ insights: [], snapshot: { revenue_this_month: 0, revenue_last_month: 0, bookings_7d: 0 }, booking_link: `${frontendUrl}/book/${slug}` });
    }
  } catch (err) {
    console.error('[growth/intelligence]', err.message);
    res.status(500).json({ error: 'Failed to compute insights' });
  }
};

// GET /api/growth/campaigns
exports.listCampaigns = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM campaign_sends cs WHERE cs.campaign_id = c.id) AS actual_sends
       FROM campaigns c
       WHERE c.business_id = $1
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [req.business.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
};

// POST /api/growth/campaigns
exports.createCampaign = async (req, res) => {
  const { name, channel, audience, subject, message, offer_type, offer_value, booking_link, scheduled_at, send_now } = req.body;
  if (!name?.trim() || !message?.trim() || !channel) {
    return res.status(400).json({ error: 'name, channel, and message are required' });
  }

  const status = channelStatus();
  if (!status[channel]) {
    return res.status(422).json({
      error: `${channel.toUpperCase()} is not configured. Please set up the integration in your environment settings.`,
      channel_not_configured: true,
    });
  }

  const id = crypto.randomUUID();
  const { rows } = await db.query(
    `INSERT INTO campaigns
       (id, business_id, name, channel, audience, subject, message, offer_type, offer_value, booking_link, status, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [id, req.business.id, name.trim(), channel, audience || 'all', subject || null, message.trim(),
     offer_type || 'none', offer_value || null, booking_link || null,
     send_now ? 'sending' : (scheduled_at ? 'scheduled' : 'draft'), scheduled_at || null]
  );
  const campaign = rows[0];

  if (send_now) {
    // Fire and forget — send asynchronously
    sendCampaignAsync(campaign, req.business).catch(err => {
      console.error('[campaign/send]', err.message);
      db.query(`UPDATE campaigns SET status='failed' WHERE id=$1`, [campaign.id]).catch(() => {});
    });
  }

  res.status(201).json(campaign);
};

// PATCH /api/growth/campaigns/:id/send
exports.sendCampaign = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE campaigns SET status='sending' WHERE id=$1 AND business_id=$2 AND status='draft' RETURNING *`,
      [req.params.id, req.business.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Campaign not found or already sent' });
    sendCampaignAsync(rows[0], req.business).catch(err => {
      console.error('[campaign/send]', err.message);
      db.query(`UPDATE campaigns SET status='failed' WHERE id=$1`, [rows[0].id]).catch(() => {});
    });
    res.json({ queued: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue campaign' });
  }
};

async function sendCampaignAsync(campaign, business) {
  const recipients = await resolveAudience(business.id, campaign.audience);
  let sent = 0, failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendOne(campaign.channel, recipient, {
        subject: campaign.subject,
        message: campaign.message,
        bookingLink: campaign.booking_link,
        businessName: business.name,
      });
      if (result) {
        sent++;
        await db.query(
          `INSERT INTO campaign_sends (id, campaign_id, customer_email, customer_phone, customer_name, consumer_id, channel)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [crypto.randomUUID(), campaign.id,
           recipient.booking_email || recipient.email,
           recipient.booking_phone || recipient.phone,
           recipient.name, recipient.consumer_id || null, campaign.channel]
        ).catch(() => {});
      } else { failed++; }
    } catch { failed++; }
  }

  await db.query(
    `UPDATE campaigns SET status='sent', sent_at=NOW(), recipient_count=$1, delivered_count=$2 WHERE id=$3`,
    [recipients.length, sent, campaign.id]
  );
}

// DELETE /api/growth/campaigns/:id
exports.deleteCampaign = async (req, res) => {
  try {
    await db.query(`DELETE FROM campaigns WHERE id=$1 AND business_id=$2 AND status='draft'`, [req.params.id, req.business.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

/* ── Automations ─────────────────────────────────────────────────────────── */

const AUTOMATION_TEMPLATES = [
  {
    trigger_type: 'retention_due',
    name: 'Retention reminder',
    description: 'Sent to customers who are due for a return visit based on their booking frequency.',
    icon: '🔁',
    channel: 'email',
    subject: "It's time for your next visit",
    message: "Hi {name},\n\nYou're due for your next appointment at {business}! We'd love to see you again.\n\nBook your slot: {link}",
  },
  {
    trigger_type: 'inactive_30',
    name: 'Win-back (30 days)',
    description: "Sent to customers who haven't booked in 30 days.",
    icon: '🎯',
    channel: 'email',
    subject: 'We miss you',
    message: "Hi {name},\n\nIt's been a while since we last saw you at {business}. Come back and treat yourself!\n\nBook now: {link}",
  },
  {
    trigger_type: 'post_visit',
    name: 'Post-visit thank you',
    description: 'Sent 24 hours after a completed appointment.',
    icon: '💛',
    channel: 'email',
    subject: 'Thanks for visiting us',
    message: "Hi {name},\n\nThank you for visiting {business}! We hope you loved your experience. We'd love to see you again soon.\n\nBook your next visit: {link}",
    delay_hours: 24,
  },
  {
    trigger_type: 'review_request',
    name: 'Review request',
    description: 'Asks customers to leave a review 48 hours after their visit.',
    icon: '⭐',
    channel: 'email',
    subject: 'How did we do?',
    message: "Hi {name},\n\nWe hope you enjoyed your recent visit to {business}. Could you spare a moment to leave us a review? Your feedback helps us improve.\n\n{link}",
    delay_hours: 48,
  },
  {
    trigger_type: 'no_show_followup',
    name: 'No-show follow-up',
    description: 'Gently re-engages customers who missed their appointment.',
    icon: '📞',
    channel: 'email',
    subject: 'We missed you today',
    message: "Hi {name},\n\nWe noticed you weren't able to make your appointment at {business} today. No worries — we'd love to reschedule you.\n\nBook again: {link}",
    delay_hours: 2,
  },
];

// GET /api/growth/automations
exports.listAutomations = async (req, res) => {
  try {
    const { rows: existing } = await db.query(
      `SELECT * FROM automations WHERE business_id = $1`,
      [req.business.id]
    );
    // Merge templates with any existing saved automations
    const merged = AUTOMATION_TEMPLATES.map(tpl => {
      const saved = existing.find(e => e.trigger_type === tpl.trigger_type);
      return saved ? { ...tpl, ...saved } : { ...tpl, id: null, business_id: req.business.id, is_active: false, sent_count: 0, booked_count: 0 };
    });
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load automations' });
  }
};

// PATCH /api/growth/automations/:trigger_type/toggle
exports.toggleAutomation = async (req, res) => {
  try {
    const { trigger_type } = req.params;
    const { is_active, channel, subject, message } = req.body;
    const tpl = AUTOMATION_TEMPLATES.find(t => t.trigger_type === trigger_type);
    if (!tpl) return res.status(404).json({ error: 'Unknown automation type' });

    // Upsert
    let row;
    if (isPostgres) {
      const id = crypto.randomUUID();
      const { rows } = await db.query(
        `INSERT INTO automations (id, business_id, name, trigger_type, channel, subject, message, delay_hours, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (business_id, trigger_type) DO UPDATE
           SET is_active = EXCLUDED.is_active,
               channel = COALESCE(EXCLUDED.channel, automations.channel),
               subject = COALESCE(EXCLUDED.subject, automations.subject),
               message = COALESCE(EXCLUDED.message, automations.message)
         RETURNING *`,
        [id, req.business.id, tpl.name, trigger_type,
         channel || tpl.channel, subject || tpl.subject, message || tpl.message,
         tpl.delay_hours || 24, !!is_active]
      );
      row = rows[0];
    } else {
      await db.query(
        `INSERT OR REPLACE INTO automations (id, business_id, name, trigger_type, channel, subject, message, delay_hours, is_active)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), req.business.id, tpl.name, trigger_type,
         channel || tpl.channel, subject || tpl.subject, message || tpl.message,
         tpl.delay_hours || 24, is_active ? 1 : 0]
      );
      row = { trigger_type, is_active };
    }
    res.json(row);
  } catch (err) {
    console.error('[automations/toggle]', err.message);
    res.status(500).json({ error: 'Failed to update automation' });
  }
};

/* ── Loyalty ─────────────────────────────────────────────────────────────── */

// GET /api/growth/loyalty
exports.loyaltyStats = async (req, res) => {
  try {
    if (!isPostgres) return res.json({ total_members: 0, avg_visits: 0, top_customers: [] });

    const { rows } = await db.query(
      `SELECT
         COUNT(DISTINCT c.id) AS total_members,
         COALESCE(AVG(c.total_visits), 0) AS avg_visits,
         COALESCE(SUM(c.lifetime_spend), 0) AS total_spend
       FROM customers c
       WHERE c.business_id = $1 AND c.total_visits >= 2`,
      [req.business.id]
    );
    const { rows: top } = await db.query(
      `SELECT c.name, c.total_visits, c.lifetime_spend, c.last_visit
       FROM customers c WHERE c.business_id = $1
       ORDER BY c.lifetime_spend DESC NULLS LAST LIMIT 5`,
      [req.business.id]
    );
    res.json({ ...rows[0], top_customers: top });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load loyalty stats' });
  }
};

/* ── Reviews management ──────────────────────────────────────────────────── */

// GET /api/growth/reviews
exports.listReviews = async (req, res) => {
  try {
    const { rows: stats } = await db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(AVG(rating), 0)::FLOAT AS avg_rating,
              COUNT(*) FILTER (WHERE rating = 5) AS five_star,
              COUNT(*) FILTER (WHERE rating = 4) AS four_star,
              COUNT(*) FILTER (WHERE rating = 3) AS three_star,
              COUNT(*) FILTER (WHERE rating = 2) AS two_star,
              COUNT(*) FILTER (WHERE rating = 1) AS one_star,
              COUNT(*) FILTER (WHERE reply_text IS NULL) AS needs_reply
       FROM reviews r
       LEFT JOIN review_replies rr ON rr.review_id = r.id
       WHERE r.business_id = $1`,
      [req.business.id]
    );

    let reviewRows;
    try {
      const { rows } = await db.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                ca.full_name AS reviewer_name,
                rr.reply_text, rr.created_at AS reply_at
         FROM reviews r
         LEFT JOIN bookings b ON b.id = r.booking_id
         LEFT JOIN consumer_accounts ca ON ca.id = b.consumer_id
         LEFT JOIN review_replies rr ON rr.review_id = r.id
         WHERE r.business_id = $1
         ORDER BY r.created_at DESC LIMIT 100`,
        [req.business.id]
      );
      reviewRows = rows;
    } catch {
      const { rows } = await db.query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                NULL AS reviewer_name, NULL AS reply_text, NULL AS reply_at
         FROM reviews r WHERE r.business_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
        [req.business.id]
      );
      reviewRows = rows;
    }
    res.json({ stats: stats[0], reviews: reviewRows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reviews' });
  }
};

/* ── Segment preview ─────────────────────────────────────────────────────── */

// GET /api/growth/audience-count?audience=inactive_30
exports.audienceCount = async (req, res) => {
  try {
    const { audience } = req.query;
    const recipients = await resolveAudience(req.business.id, audience || 'all');
    res.json({ count: recipients.length, audience });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count audience' });
  }
};
