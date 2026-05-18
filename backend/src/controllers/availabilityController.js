const { Availability, BlockedSlot } = require('../models/Availability');
const { getAvailableSlots } = require('../services/slotService');
const Service = require('../models/Service');
const Business = require('../models/Business');

exports.get = async (req, res) => {
  try {
    const availability = await Availability.findByBusinessId(req.business.id);
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
};

exports.upsert = async (req, res) => {
  try {
    const { working_days, opening_time, closing_time, slot_interval_minutes, buffer_minutes } = req.body;
    const availability = await Availability.upsert({
      business_id: req.business.id,
      working_days,
      opening_time,
      closing_time,
      slot_interval_minutes,
      buffer_minutes,
    });
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save availability' });
  }
};

exports.getBlockedSlots = async (req, res) => {
  try {
    const slots = await BlockedSlot.findByBusinessId(req.business.id);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocked slots' });
  }
};

exports.addBlockedSlot = async (req, res) => {
  try {
    const { blocked_date, start_time, end_time, reason, is_full_day } = req.body;
    const slot = await BlockedSlot.create({
      business_id: req.business.id,
      blocked_date,
      start_time,
      end_time,
      reason,
      is_full_day,
    });
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to block slot' });
  }
};

exports.removeBlockedSlot = async (req, res) => {
  try {
    const deleted = await BlockedSlot.delete(req.params.id, req.business.id);
    if (!deleted) return res.status(404).json({ error: 'Blocked slot not found' });
    res.json({ message: 'Unblocked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove blocked slot' });
  }
};

// Public endpoint: get available slots for a date + service
exports.getSlots = async (req, res) => {
  try {
    const { date, service_id } = req.query;
    if (!date || !service_id) {
      return res.status(400).json({ error: 'date and service_id are required' });
    }

    const service = await Service.findById(service_id);
    if (!service || service.business_id !== req.business.id) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const slots = await getAvailableSlots(req.business.id, date, service.duration_minutes, req.business.timezone);
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};
