const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

exports.adminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_SUPPORT_PASSWORD || 'bookam-support-2024';
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign({ type: 'admin', role: 'superadmin' }, JWT_SECRET, { expiresIn: '30d' });
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
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

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
