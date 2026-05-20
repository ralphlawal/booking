const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Notification = require('../models/Notification');
const generateReference = require('../utils/generateReference');
const { sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking, sendBookingRescheduled, sendReviewReminder } = require('../services/emailService');
const db = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function authenticateAdmin(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    return payload.type === 'admin';
  } catch { return false; }
}

exports.create = async (req, res) => {
  // Honeypot: bots fill hidden fields, humans don't
  if (req.body.website) return res.status(201).json({ reference_id: 'BOT-BLOCKED', honeypot: true });
  try {
    const { service_id, booking_date, start_time, customer_name, customer_phone, customer_email, notes, stripe_payment_intent_id } = req.body;

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
      stripe_payment_intent_id: stripe_payment_intent_id || null,
    });

    await Customer.incrementBookings(customer.id);

    // Fetch full booking for emails
    const fullBooking = await Booking.findByReference(reference_id);

    if (customer_email) sendBookingConfirmation({ ...fullBooking, customer_email });
    if (req.business.email) sendOwnerNewBooking(fullBooking, req.business.email);

    if (consumer_id) {
      Notification.create({
        consumer_id,
        type: 'booking',
        title: 'Booking request sent',
        body: `Your ${fullBooking.service_name} at ${fullBooking.business_name} on ${booking_date} is pending confirmation.`,
        link: `/booking/success/${reference_id}`,
      }).catch(() => {});
    }

    res.status(201).json(fullBooking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Booking failed' });
  }
};

exports.list = async (req, res) => {
  try {
    const { status, date, page, limit } = req.query;
    const [{ rows: bookings, total }, stats] = await Promise.all([
      Booking.findByBusinessId(req.business.id, {
        status,
        date,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      }),
      Booking.getStats(req.business.id),
    ]);
    res.json({ bookings, total, stats });
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

exports.lookup = async (req, res) => {
  try {
    const { reference_id, email } = req.body;
    if (!reference_id || !email)
      return res.status(400).json({ error: 'Reference ID and email are required' });

    const booking = await Booking.findByReference(reference_id.trim().toUpperCase());
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Verify the email matches the customer who made this booking
    if (booking.customer_email?.toLowerCase() !== email.trim().toLowerCase())
      return res.status(404).json({ error: 'Booking not found' });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to look up booking' });
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

    if (status === 'completed' && fullBooking.customer_email) {
      sendReviewReminder(fullBooking).catch(() => {});
    }

    if (fullBooking.consumer_id && ['confirmed','cancelled'].includes(status)) {
      const notifTitle = status === 'confirmed'
        ? `Booking confirmed — ${fullBooking.service_name}`
        : `Booking cancelled — ${fullBooking.service_name}`;
      const notifBody = status === 'confirmed'
        ? `Your appointment at ${fullBooking.business_name} on ${fullBooking.booking_date} at ${fullBooking.start_time?.slice(0,5)} is confirmed.`
        : `Your booking at ${fullBooking.business_name} has been cancelled.${fullBooking.cancelled_reason ? ` Reason: ${fullBooking.cancelled_reason}` : ''}`;
      Notification.create({
        consumer_id: fullBooking.consumer_id,
        type: status,
        title: notifTitle,
        body: notifBody,
        link: `/customer/dashboard`,
      }).catch(() => {});
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

exports.exportCsv = async (req, res) => {
  try {
    const { rows: bookings } = await require('../config/database').query(
      `SELECT b.reference_id, c.full_name AS customer_name, c.phone AS customer_phone,
              c.email AS customer_email, s.name AS service_name,
              s.price AS service_price, b.booking_date, b.start_time, b.end_time,
              b.status, b.notes, b.created_at
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN customers c ON c.id = b.customer_id
       WHERE b.business_id = $1
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [req.business.id]
    );

    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = ['Reference','Customer Name','Phone','Email','Service','Price (£)','Date','Start Time','End Time','Status','Notes','Created At'];
    const rows = bookings.map(b => [
      b.reference_id, b.customer_name, b.customer_phone, b.customer_email,
      b.service_name, parseFloat(b.service_price || 0).toFixed(2),
      b.booking_date, b.start_time?.slice(0,5), b.end_time?.slice(0,5),
      b.status, b.notes, b.created_at?.toISOString().slice(0,10),
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
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
            <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779210788/IMG_0364_cgkeo4.png" alt="BookAm Business" style="height:32px;filter:brightness(0) invert(1)" />
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

// POST /bookings/ref/:ref/confirm-service  (public — consumer confirms service was rendered)
exports.confirmService = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['confirmed', 'completed', 'pending'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot confirm service for this booking' });
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM service_confirmations WHERE booking_id = $1', [booking.id]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'Service already confirmed' });

    const { rows: dispRows } = await db.query(
      'SELECT id FROM disputes WHERE booking_id = $1', [booking.id]
    );
    if (dispRows.length > 0) return res.status(400).json({ error: 'A dispute is open for this booking' });

    const id = crypto.randomUUID();
    const consumer_id = req.body.consumer_id || null;
    await db.query(
      'INSERT INTO service_confirmations (id, booking_id, consumer_id) VALUES ($1, $2, $3)',
      [id, booking.id, consumer_id]
    );

    // Mark booking as completed if not already
    if (booking.status !== 'completed') {
      await Booking.updateStatus(booking.id, booking.business_id, 'completed', null);
    }

    res.json({ message: 'Service confirmed — thank you!' });
  } catch (err) {
    console.error('[confirmService]', err.message);
    res.status(500).json({ error: 'Failed to confirm service' });
  }
};

// POST /bookings/ref/:ref/dispute  (consumer raises a dispute)
exports.raiseDispute = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { reason, description, consumer_id } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required' });

    // Only allow disputes for paid bookings within 14 days of service date
    const serviceDate = new Date(booking.booking_date + 'T12:00:00Z');
    const daysSince = (Date.now() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) {
      return res.status(400).json({ error: 'Disputes must be raised within 14 days of the service date' });
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM disputes WHERE booking_id = $1', [booking.id]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'A dispute already exists for this booking' });

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO disputes (id, booking_id, consumer_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, booking.id, consumer_id || null, reason.trim(), description?.trim() || null]
    );

    // Notify admin via email
    const { sendEmail } = require('../services/emailService');
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'hello@bookam.business',
      subject: `New Dispute: ${booking.reference_id}`,
      type: 'dispute_raised',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#dc2626">New Dispute Raised</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#64748b;width:130px">Reference</td><td style="font-weight:600;font-family:monospace">${booking.reference_id}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Customer</td><td>${booking.customer_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Business</td><td>${booking.business_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Service</td><td>${booking.service_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Reason</td><td>${reason}</td></tr>
          ${description ? `<tr><td style="padding:6px 0;color:#64748b">Details</td><td>${description}</td></tr>` : ''}
        </table>
        <p style="margin-top:20px"><a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/admin-support">View in admin dashboard</a></p>
      </div>`,
    }).catch(() => {});

    res.json({ message: 'Dispute raised — our team will review within 48 hours.' });
  } catch (err) {
    console.error('[raiseDispute]', err.message);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
};

// GET /bookings/admin/disputes  (admin only)
exports.getDisputes = async (req, res) => {
  if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Admin access required' });
  try {
    const { rows } = await db.query(
      `SELECT d.*, b.reference_id, b.booking_date, b.stripe_payment_intent_id, b.payment_status,
              c.full_name AS customer_name, c.email AS customer_email,
              biz.name AS business_name, s.name AS service_name, s.price
       FROM disputes d
       JOIN bookings b ON b.id = d.booking_id
       LEFT JOIN customers cu ON cu.id = b.customer_id
       LEFT JOIN consumer_accounts c ON c.id = d.consumer_id
       JOIN businesses biz ON biz.id = b.business_id
       JOIN services s ON s.id = b.service_id
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[getDisputes]', err.message);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
};

// POST /bookings/admin/disputes/:id/resolve  (admin only)
exports.resolveDispute = async (req, res) => {
  if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Admin access required' });
  try {
    const { action, admin_notes } = req.body; // action: 'refund' | 'reject'
    if (!['refund', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be refund or reject' });

    const { rows } = await db.query('SELECT * FROM disputes WHERE id = $1', [req.params.id]);
    const dispute = rows[0];
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.status !== 'open') return res.status(400).json({ error: 'Dispute already resolved' });

    let stripe_refund_id = null;

    if (action === 'refund') {
      const { rows: bookingRows } = await db.query(
        'SELECT stripe_payment_intent_id FROM bookings WHERE id = $1', [dispute.booking_id]
      );
      const pi_id = bookingRows[0]?.stripe_payment_intent_id;
      if (pi_id && process.env.STRIPE_SECRET_KEY) {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const refund = await stripe.refunds.create({ payment_intent: pi_id });
          stripe_refund_id = refund.id;
          await db.query(
            `UPDATE bookings SET payment_status = 'refunded' WHERE id = $1`,
            [dispute.booking_id]
          );
        } catch (stripeErr) {
          console.error('[resolveDispute] Stripe refund error:', stripeErr.message);
          return res.status(500).json({ error: `Stripe refund failed: ${stripeErr.message}` });
        }
      }
    }

    const status = action === 'refund' ? 'resolved_refunded' : 'resolved_rejected';
    await db.query(
      `UPDATE disputes SET status = $1, admin_notes = $2, stripe_refund_id = $3, resolved_at = NOW()
       WHERE id = $4`,
      [status, admin_notes || null, stripe_refund_id, dispute.id]
    );

    res.json({ message: action === 'refund' ? 'Refund issued successfully' : 'Dispute rejected' });
  } catch (err) {
    console.error('[resolveDispute]', err.message);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
};
