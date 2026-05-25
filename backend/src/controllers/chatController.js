const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

exports.adminLogin = async (req, res) => {
  try {
    const { password = '' } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_SUPPORT_PASSWORD
      || (process.env.NODE_ENV === 'production' ? null : 'bookam-support-2024');
    if (!ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Admin support login is not configured' });
    }
    if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD.length < 16) {
      return res.status(503).json({ error: 'Admin support login is not securely configured' });
    }

    const supplied = Buffer.from(String(password));
    const expected = Buffer.from(String(ADMIN_PASSWORD));
    const valid = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { type: 'admin', role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: process.env.ADMIN_SESSION_TTL || '8h' }
    );
    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getOrCreateRoom = async (req, res) => {
  try {
    const { type, consumer_id, business_id, subject } = req.body;
    let opts = { type, subject };

    if (type === 'business_customer') {
      opts.business_id = req.business ? req.business.id : business_id;
      opts.consumer_id = req.consumer ? req.consumer.id : consumer_id;
    } else if (type === 'admin_business') {
      opts.business_id = req.business ? req.business.id : business_id;
    } else if (type === 'admin_consumer') {
      opts.consumer_id = req.consumer ? req.consumer.id : consumer_id;
    } else {
      return res.status(400).json({ error: 'Invalid room type' });
    }

    const room = await Chat.findOrCreateRoom(opts);
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

exports.getRooms = async (req, res) => {
  try {
    let rooms;
    if (req.admin) rooms = await Chat.getAllRooms();
    else if (req.business) rooms = await Chat.getRoomsForBusiness(req.business.id);
    else if (req.consumer) rooms = await Chat.getRoomsForConsumer(req.consumer.id);
    else return res.status(401).json({ error: 'Not authenticated' });
    res.json(rooms);
  } catch {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const room = await Chat.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!req.admin) {
      if (req.business && room.business_id !== req.business.id) return res.status(403).json({ error: 'Access denied' });
      if (req.consumer && room.consumer_id !== req.consumer.id) return res.status(403).json({ error: 'Access denied' });
    }
    const messages = await Chat.getMessages(req.params.id, req.query.since || null);
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message is required' });

    const room = await Chat.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    let sender_type, sender_name;
    if (req.admin) {
      sender_type = 'admin'; sender_name = 'Support Team';
    } else if (req.business) {
      if (room.business_id !== req.business.id) return res.status(403).json({ error: 'Access denied' });
      sender_type = 'business'; sender_name = req.business.name;
    } else if (req.consumer) {
      if (room.consumer_id !== req.consumer.id) return res.status(403).json({ error: 'Access denied' });
      sender_type = 'consumer'; sender_name = req.consumer.full_name;
    } else {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const msg = await Chat.addMessage({ room_id: req.params.id, sender_type, sender_name, content: content.trim() });
    res.json(msg);

    // Fire-and-forget notifications (do not await — never block the response)
    notifyRecipient({ room, sender_type, sender_name, content: content.trim() }).catch(() => {});
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

async function notifyRecipient({ room, sender_type, sender_name, content }) {
  const { sendEmail } = require('../services/emailService');
  const preview = content.length > 80 ? content.slice(0, 77) + '…' : content;

  // Admin or business replies to a consumer → in-app notification
  if ((sender_type === 'admin' || sender_type === 'business') && room.consumer_id) {
    const { rows: [consumer] } = await db.query(
      'SELECT id, full_name, email FROM consumer_accounts WHERE id = $1',
      [room.consumer_id]
    );
    if (consumer) {
      await Notification.create({
        consumer_id: consumer.id,
        type: 'message',
        title: `New message from ${sender_name}`,
        body: preview,
        link: '/customer/messages',
      });
      // Email too if they haven't been active recently
      if (consumer.email) {
        sendEmail({
          to: consumer.email,
          subject: `New message from ${sender_name} — BookAm`,
          type: 'chat_notification',
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px">New message from ${sender_name}</h2>
            <p style="color:#475569;font-size:14px;background:#f1f5f9;border-radius:10px;padding:14px 18px;margin:16px 0">${preview}</p>
            <a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/customer/messages"
               style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px">
              Reply on BookAm
            </a>
          </div>`,
        }).catch(() => {});
      }
    }
  }

  // Admin replies to a business → email the business owner
  if (sender_type === 'admin' && room.business_id) {
    const { rows: [biz] } = await db.query(
      `SELECT b.name, b.email FROM businesses b WHERE b.id = $1`,
      [room.business_id]
    );
    if (biz?.email) {
      sendEmail({
        to: biz.email,
        subject: `BookAm Support replied — ${preview}`,
        type: 'chat_notification',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px">New message from BookAm Support</h2>
          <p style="color:#475569;font-size:14px;background:#f1f5f9;border-radius:10px;padding:14px 18px;margin:16px 0">${preview}</p>
          <a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/admin/messages"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px">
            View in dashboard
          </a>
        </div>`,
      }).catch(() => {});
    }
  }
}

exports.getAdminUsers = async (req, res) => {
  try {
    const [biz, cons] = await Promise.all([
      db.query('SELECT id, name, email FROM businesses ORDER BY name'),
      db.query('SELECT id, full_name AS name, email FROM consumer_accounts ORDER BY full_name'),
    ]);
    res.json({ businesses: biz.rows, consumers: cons.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
