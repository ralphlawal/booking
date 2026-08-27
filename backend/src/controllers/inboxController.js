const crypto = require('crypto');
const db = require('../config/database');
const { sendEmail } = require('../services/emailService');
const { sendSms } = require('../services/smsService');

const channels = new Set(['in_app', 'email', 'sms', 'whatsapp']);
const permitted = new Set(['inbox_view', 'inbox_send', 'inbox_manage']);
const unavailable = (res, err) => err?.code === '42P01' || /inbox_(conversations|messages).*does not exist/i.test(err?.message || '')
  ? res.status(503).json({ error: 'Unified inbox is unavailable until migration 039 has been applied.' }) : null;

async function conversation(businessId, customerId, bookingId) {
  const { rows: found } = await db.query('SELECT * FROM inbox_conversations WHERE business_id=$1 AND customer_id=$2', [businessId, customerId]);
  if (found[0]) return found[0];
  const { rows } = await db.query(`INSERT INTO inbox_conversations (id,business_id,customer_id,booking_id) VALUES ($1,$2,$3,$4) RETURNING *`, [crypto.randomUUID(), businessId, customerId, bookingId || null]);
  return rows[0];
}

exports.list = async (req, res) => {
  try {
    const upcoming = process.env.DATABASE_URL ? `(SELECT json_build_object('id',b.id,'reference_id',b.reference_id,'booking_date',b.booking_date,'start_time',b.start_time,'service_name',s.name,'status',b.status) FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.customer_id=ic.customer_id AND b.business_id=ic.business_id AND b.booking_date >= CURRENT_DATE AND b.status NOT IN ('cancelled') ORDER BY b.booking_date,b.start_time LIMIT 1)` : 'NULL';
    const { rows } = await db.query(`SELECT ic.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
      ${upcoming} AS upcoming_booking
      FROM inbox_conversations ic JOIN customers c ON c.id=ic.customer_id WHERE ic.business_id=$1 ORDER BY ic.last_message_at DESC`, [req.business.id]);
    res.json(rows);
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to load inbox' }); }
};

exports.createConversation = async (req, res) => {
  try {
    const { customer_id, booking_id } = req.body;
    const { rows } = await db.query('SELECT id FROM customers WHERE id=$1 AND business_id=$2', [customer_id, req.business.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.status(201).json(await conversation(req.business.id, customer_id, booking_id));
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to start conversation' }); }
};

exports.detail = async (req, res) => {
  try {
    const { rows: rooms } = await db.query(`SELECT ic.*, c.full_name,c.email,c.phone,c.notes FROM inbox_conversations ic JOIN customers c ON c.id=ic.customer_id WHERE ic.id=$1 AND ic.business_id=$2`, [req.params.id, req.business.id]);
    const room = rooms[0]; if (!room) return res.status(404).json({ error: 'Conversation not found' });
    const [messages, bookings] = await Promise.all([
      db.query('SELECT * FROM inbox_messages WHERE conversation_id=$1 ORDER BY created_at ASC LIMIT 250', [room.id]),
      db.query(`SELECT b.id,b.reference_id,b.booking_date,b.start_time,b.status,s.name AS service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.customer_id=$1 AND b.business_id=$2 ORDER BY b.booking_date DESC,b.start_time DESC LIMIT 20`, [room.customer_id, req.business.id]),
    ]);
    await db.query('UPDATE inbox_messages SET read_at=NOW() WHERE conversation_id=$1 AND direction=\'inbound\' AND read_at IS NULL', [room.id]);
    await db.query('UPDATE inbox_conversations SET unread_count=0 WHERE id=$1', [room.id]);
    res.json({ conversation: room, messages: messages.rows, upcoming_booking: bookings.rows.find(b => new Date(`${String(b.booking_date).slice(0,10)}T${b.start_time}`) >= new Date() && b.status !== 'cancelled') || null, previous_bookings: bookings.rows });
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to load conversation' }); }
};

exports.send = async (req, res) => {
  try {
    const { content, channel = 'in_app', subject, booking_id, type = 'message', staff_id } = req.body;
    if (!content?.trim() || !channels.has(channel)) return res.status(400).json({ error: 'Content and a supported channel are required' });
    const { rows } = await db.query(`SELECT ic.*,c.full_name,c.email,c.phone FROM inbox_conversations ic JOIN customers c ON c.id=ic.customer_id WHERE ic.id=$1 AND ic.business_id=$2`, [req.params.id, req.business.id]);
    const room = rows[0]; if (!room) return res.status(404).json({ error: 'Conversation not found' });
    let status = 'queued'; let provider = null; let providerReference = null;
    if (channel === 'email' && room.email && process.env.RESEND_API_KEY) { await sendEmail({ to: room.email, subject: subject || `Message from ${req.business.name}`, html: `<p>${content.trim().replace(/\n/g, '<br>')}</p>`, business_id: req.business.id, booking_id, type: `inbox_${type}` }); status = 'sent'; provider = 'resend'; }
    else if (channel === 'sms' && room.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) { const result = await sendSms(room.phone, content.trim()); status = 'sent'; provider = 'twilio'; providerReference = result?.sid || null; }
    // WhatsApp has no configured provider: it remains queued instead of claiming delivery.
    else if (channel === 'in_app') { status = 'sent'; provider = 'bookam'; }
    const { rows: message } = await db.query(`INSERT INTO inbox_messages (id,conversation_id,business_id,customer_id,booking_id,direction,channel,type,content,subject,status,provider,provider_reference,sender_staff_id) VALUES ($1,$2,$3,$4,$5,'outbound',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, [crypto.randomUUID(), room.id, req.business.id, room.customer_id, booking_id || null, channel, type, content.trim(), subject || null, status, provider, providerReference, staff_id || null]);
    await db.query('UPDATE inbox_conversations SET last_message_at=NOW(),last_message_preview=$2,updated_at=NOW() WHERE id=$1', [room.id, content.trim().slice(0, 180)]);
    res.status(201).json(message[0]);
  } catch (err) { if (!unavailable(res, err)) res.status(500).json({ error: 'Unable to send message' }); }
};

exports.staffPermissions = async (req, res) => {
  try { const { rows } = await db.query('SELECT id,name,role,inbox_permissions FROM staff_members WHERE business_id=$1 AND is_active=TRUE ORDER BY name', [req.business.id]); res.json(rows.map(s => ({ ...s, inbox_permissions: (() => { try { return JSON.parse(s.inbox_permissions || '[]'); } catch { return []; } })() }))); }
  catch (err) { res.status(500).json({ error: 'Unable to load staff permissions' }); }
};
exports.updateStaffPermissions = async (req, res) => {
  try { const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.filter(p => permitted.has(p)) : []; const { rows } = await db.query('UPDATE staff_members SET inbox_permissions=$1 WHERE id=$2 AND business_id=$3 RETURNING id,name,inbox_permissions', [JSON.stringify(permissions), req.params.staffId, req.business.id]); if (!rows[0]) return res.status(404).json({ error: 'Staff member not found' }); res.json({ ...rows[0], inbox_permissions: permissions }); }
  catch (err) { res.status(500).json({ error: 'Unable to update staff permissions' }); }
};
