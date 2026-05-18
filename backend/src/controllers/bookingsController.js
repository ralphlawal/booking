const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const generateReference = require('../utils/generateReference');
const { sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking } = require('../services/emailService');

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
    const { status, cancelled_reason } = req.body;
    const allowed = ['pending','confirmed','cancelled','completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.updateStatus(req.params.id, req.business.id, status, cancelled_reason);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const fullBooking = await Booking.findById(booking.id);

    if (fullBooking.customer_email && ['confirmed','cancelled'].includes(status)) {
      sendBookingStatusUpdate({ ...fullBooking, customer_email: fullBooking.customer_email });
    }

    if (status === 'cancelled' && fullBooking.customer_id) {
      const original = await Booking.findById(req.params.id);
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
    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
};
