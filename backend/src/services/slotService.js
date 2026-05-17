const { Availability, BlockedSlot } = require('../models/Availability');
const Booking = require('../models/Booking');

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const generateSlots = (openingTime, closingTime, intervalMinutes, durationMinutes, bufferMinutes = 0) => {
  const slots = [];
  const open = timeToMinutes(openingTime);
  const close = timeToMinutes(closingTime);
  const step = intervalMinutes;
  const needed = durationMinutes + bufferMinutes;

  for (let start = open; start + needed <= close; start += step) {
    slots.push({
      start: minutesToTime(start),
      end: minutesToTime(start + durationMinutes),
    });
  }
  return slots;
};

const getAvailableSlots = async (business_id, date, service_duration_minutes) => {
  const availability = await Availability.findByBusinessId(business_id);
  if (!availability) return [];

  const dateObj = new Date(date + 'T00:00:00Z');
  const dayName = DAY_NAMES[dateObj.getUTCDay()];

  const workingDays = availability.working_days;
  if (!workingDays.includes(dayName)) return [];

  // Check for full-day blocks
  const blocked = await BlockedSlot.findByBusinessAndDate(business_id, date);
  if (blocked.some(b => b.is_full_day)) return [];

  // Generate raw slots
  const allSlots = generateSlots(
    availability.opening_time,
    availability.closing_time,
    availability.slot_interval_minutes,
    service_duration_minutes,
    availability.buffer_minutes
  );

  // Remove time-blocked slots
  const partialBlocks = blocked.filter(b => !b.is_full_day);
  const filteredSlots = allSlots.filter(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return !partialBlocks.some(block => {
      const bStart = timeToMinutes(block.start_time);
      const bEnd = timeToMinutes(block.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });
  });

  // Remove already-booked slots
  const bookings = await Booking.findByBusinessId(business_id, { date });
  const available = filteredSlots.filter(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return !bookings.some(booking => {
      const bStart = timeToMinutes(booking.start_time.slice(0, 5));
      const bEnd = timeToMinutes(booking.end_time.slice(0, 5));
      return slotStart < bEnd && slotEnd > bStart;
    });
  });

  return available;
};

module.exports = { getAvailableSlots, generateSlots, timeToMinutes, minutesToTime };
