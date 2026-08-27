const { Availability, BlockedSlot } = require('../models/Availability');
const Booking = require('../models/Booking');
const db = require('../config/database');

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

const getNowInTz = (tz) => {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type)?.value || '00';
    return {
      dateStr: `${get('year')}-${get('month')}-${get('day')}`,
      mins: parseInt(get('hour')) * 60 + parseInt(get('minute')),
    };
  } catch {
    return { dateStr: new Date().toISOString().slice(0, 10), mins: 0 };
  }
};

const getDayNameInTz = (date, tz) => {
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz })
      .format(new Date(date + 'T12:00:00Z'))
      .toLowerCase();
  } catch {
    return DAY_NAMES[new Date(date + 'T00:00:00Z').getUTCDay()];
  }
};

const getAvailableSlots = async (business_id, date, service_duration_minutes, timezone = 'UTC', service_buffer_minutes = 0, service_id = null) => {
  const availability = await Availability.findByBusinessId(business_id);
  if (!availability) return [];

  const tz = timezone || 'UTC';
  const dayName = getDayNameInTz(date, tz);

  const workingDays = availability.working_days;
  if (!workingDays.includes(dayName)) return [];

  // Check for full-day blocks
  const blocked = await BlockedSlot.findByBusinessAndDate(business_id, date);
  if (blocked.some(b => b.is_full_day)) return [];

  // Use service-specific buffer if provided, else fall back to global
  const effectiveBuffer = service_buffer_minutes > 0 ? service_buffer_minutes : (availability.buffer_minutes || 0);

  // Generate raw slots
  const allSlots = generateSlots(
    availability.opening_time,
    availability.closing_time,
    availability.slot_interval_minutes,
    service_duration_minutes,
    effectiveBuffer
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

  // Remove already-booked slots (exclude cancelled bookings from blocking)
  const { rows: bookings } = await Booking.findByBusinessId(business_id, { date, limit: 200 });
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  let available = filteredSlots.filter(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return !activeBookings.some(booking => {
      const bStart = timeToMinutes(booking.start_time.slice(0, 5));
      const bEnd = timeToMinutes(booking.end_time.slice(0, 5));
      return slotStart < bEnd && slotEnd > bStart;
    });
  });

  // Resource conflict checking — if service requires specific resources,
  // remove slots where those resources are already occupied
  if (service_id) {
    try {
      const { rows: srRows } = await db.query(
        'SELECT resource_id FROM service_resources WHERE service_id = $1',
        [service_id]
      );
      if (srRows.length > 0) {
        const resourceIds = srRows.map(r => r.resource_id);
        const { rows: conflicting } = await db.query(
          `SELECT b.start_time, b.end_time
           FROM bookings b
           JOIN service_resources sr ON sr.service_id = b.service_id
           WHERE b.business_id = $1 AND b.booking_date = $2
             AND b.status != 'cancelled'
             AND sr.resource_id = ANY($3::uuid[])`,
          [business_id, date, resourceIds]
        );
        if (conflicting.length > 0) {
          available = available.filter(slot => {
            const sStart = timeToMinutes(slot.start);
            const sEnd   = timeToMinutes(slot.end);
            return !conflicting.some(c => {
              const cStart = timeToMinutes((c.start_time || '').slice(0, 5));
              const cEnd   = timeToMinutes((c.end_time   || '').slice(0, 5));
              return sStart < cEnd && sEnd > cStart;
            });
          });
        }
      }
    } catch {
      // Table may not exist yet — skip resource check gracefully
    }
  }

  // Filter out past slots if the requested date is today in the business's timezone
  const now = getNowInTz(tz);
  if (date === now.dateStr) {
    available = available.filter(slot => timeToMinutes(slot.start) > now.mins + 30);
  }

  return available;
};

module.exports = { getAvailableSlots, generateSlots, timeToMinutes, minutesToTime };
