const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const generateReference = require('../utils/generateReference');
const { sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking, sendBookingRescheduled } = require('../services/emailService');

exports.create = async (req, res) => {
  try {
    const { service_id, booking_date, start_time, customer_name, customer_phone, customer_email, notes } = req.body;

    const service = await Service.findById(service_id);
    if (!service || service.business_id !== req.business.id || !service.is_active) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Calculate end time
    const [h, m] = start_time.split(':').map(Number);
    const endMins = h * 60 + m + service.duration_minutes;
    const end_time = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    // Check conflict
    const hasConflict = await Booking.checkConflict(req.business.id, booking_date, start_time, end_time);
    if (hasConflict) return res.status(409).json({ error: 'This time slot is no longer available' });

    // Get or create customer
    const customer = await Customer.findOrCreate({
      business_id: req.business.id,
      full_name: customer_name,
      phone: customer_phone,
      email: customer_email,
    });

    const reference_id = generateReference();
    const { consumer_id } = req.body;
    const booking = await Booking.create({
      reference_id,
      business_id: req.business.id,
      service_id,
      customer_id: customer.id,
      consumer_id: consumer_id || null,
      booking_date,
      start_time,
      end_time,
      notes,
    });

    await Customer.incrementBookings(customer.id);

    // Fetch full booking for emails
    const fullBooking = await Booking.findByReference(reference_id);

    if (customer_email) sendBookingConfirmation({ ...fullBooking, customer_email });
    if (req.business.email) sendOwnerNewBooking(fullBooking, req.business.email);

    res.status(201).json(fullBooking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Booking failed' });
  }
};

exports.list = async (req, res) => {
  try {
    const { status, date, page, limit } = req.query;
    const bookings = await Booking.findByBusinessId(req.business.id, { status, date, page, limit });
    const stats = await Booking.getStats(req.business.id);
    res.json({ bookings, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

exports.getById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.business_id !== req.business.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

exports.getByReference = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, cancelled_reason, no_show } = req.body;
    const allowed = ['pending','confirmed','cancelled','completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const reason = no_show ? 'No-show' : (cancelled_reason || null);
    const booking = await Booking.updateStatus(req.params.id, req.business.id, status, reason);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const fullBooking = await Booking.findById(booking.id);

    if (fullBooking.customer_email && ['confirmed','cancelled'].includes(status)) {
      sendBookingStatusUpdate({ ...fullBooking, customer_email: fullBooking.customer_email });
    }

    if (no_show && fullBooking.customer_id) {
      await Customer.incrementNoShows(fullBooking.customer_id).catch(() => {});
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

exports.reschedule = async (req, res) => {
  try {
    const { booking_date, start_time } = req.body;

    const existing = await Booking.findById(req.params.id);
    if (!existing || existing.business_id !== req.business.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const service = await Service.findById(existing.service_id);
    const [h, m] = start_time.split(':').map(Number);
    const endMins = h * 60 + m + service.duration_minutes;
    const end_time = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    const hasConflict = await Booking.checkConflict(
      req.business.id, booking_date, start_time, end_time, req.params.id
    );
    if (hasConflict) return res.status(409).json({ error: 'This time slot is not available' });

    const booking = await Booking.reschedule(req.params.id, req.business.id, { booking_date, start_time, end_time });

    const fullBooking = await Booking.findById(booking.id);
    if (fullBooking?.customer_email) {
      sendBookingRescheduled(fullBooking).catch(() => {});
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Reschedule failed' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await Booking.getAnalytics(req.business.id);
    res.json(analytics);
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.cancelByCustomer = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: `Booking is already ${booking.status}` });
    }

    // Prevent cancellation less than 2 hours before appointment
    const apptDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const hoursUntil = (apptDateTime - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 2) {
      return res.status(400).json({ error: 'Bookings cannot be cancelled less than 2 hours before the appointment' });
    }

    await Booking.updateStatus(booking.id, booking.business_id, 'cancelled', 'Cancelled by customer');

    // Notify business owner
    if (booking.business_email) {
      sendEmail({
        to: booking.business_email,
        subject: `Booking Cancelled: ${booking.customer_name} – ${booking.reference_id}`,
        type: 'customer_cancelled',
        business_id: booking.business_id,
        booking_id: booking.id,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
          <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 32px;text-align:center">
            <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779054818/99A671C3-1992-4C69-A170-BB994A854543_tf8sb4.png" alt="BookAm" style="height:32px;filter:brightness(0) invert(1)" />
          </div>
          <div style="padding:32px">
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px">Booking Cancelled ❌</h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 20px"><strong>${booking.customer_name}</strong> has cancelled their booking.</p>
            <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
              <tr><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%;background:#f8fafc">Reference</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500;font-family:monospace">${booking.reference_id}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">Customer</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${booking.customer_name}${booking.customer_phone ? ` · ${booking.customer_phone}` : ''}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%;background:#f8fafc">Service</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${booking.service_name}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">Was booked for</td><td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${booking.booking_date} at ${booking.start_time?.slice(0,5)}</td></tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;text-align:center">This slot is now available again. Log in to your dashboard to rebook it.</p>
          </div>
        </div>`,
      }).catch(() => {});
    }

    // Confirm cancellation to customer
    if (booking.customer_email) {
      sendBookingStatusUpdate({ ...booking, status: 'cancelled', cancelled_reason: 'Cancelled by customer' }).catch(() => {});
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
};
