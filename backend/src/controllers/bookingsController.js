const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Notification = require('../models/Notification');
const generateReference = require('../utils/generateReference');
const { sendEmail, sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking, sendBookingRescheduled, sendReviewReminder, sendAttendedConfirmationEmail, sendBusinessPaymentReleasedEmail } = require('../services/emailService');
const db = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { calculateServerAmount } = require('./paymentsController');
const { isAdmin } = require('../middleware/adminAuth');

const JWT_SECRET = process.env.JWT_SECRET || 'bookam-jwt-secret-change-in-prod';

function bookingDateKey(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function bookingDateTime(dateValue, timeValue, fallback = '23:59') {
  const key = bookingDateKey(dateValue);
  if (!key) return null;
  const time = String(timeValue || fallback).slice(0, 5);
  const dt = new Date(`${key}T${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

exports.create = async (req, res) => {
  // Honeypot: bots fill hidden fields, humans don't
  if (req.body.website) return res.status(201).json({ reference_id: 'BOT-BLOCKED', honeypot: true });
  try {
    const { service_id, booking_date, start_time, customer_name, customer_phone, customer_email, notes, stripe_payment_intent_id, idempotency_key,
            consumer_id, staff_member_id, promo_code } = req.body;

    const service = await Service.findById(service_id);
    if (!service || service.business_id !== req.business.id || !service.is_active) {
      return res.status(404).json({ error: 'Service not found' });
    }

    let verifiedPromoCode = null;
    let verifiedDiscount = 0;
    let expectedAmountPence = Math.max(0, Math.round(parseFloat(service.price || 0) * 100));
    if (promo_code || stripe_payment_intent_id) {
      const amount = await calculateServerAmount({
        service_id,
        business_slug: req.business.slug,
        promo_code,
      });
      verifiedPromoCode = amount.promoCode;
      verifiedDiscount = amount.discount;
      expectedAmountPence = amount.amount_pence;
    }

    if (stripe_payment_intent_id) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Online payments are not configured' });
      }
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const intent = await stripe.paymentIntents.retrieve(stripe_payment_intent_id);
      if (!intent || intent.amount !== expectedAmountPence) {
        return res.status(400).json({ error: 'Payment amount does not match this booking' });
      }
      if (!['succeeded', 'processing', 'requires_capture'].includes(intent.status)) {
        return res.status(400).json({ error: 'Payment has not completed yet' });
      }
      if (intent.metadata?.service_id && intent.metadata.service_id !== service_id) {
        return res.status(400).json({ error: 'Payment does not match this service' });
      }
      if (intent.metadata?.business_id && intent.metadata.business_id !== req.business.id) {
        return res.status(400).json({ error: 'Payment does not match this business' });
      }
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
      idempotency_key: idempotency_key || null,
    });

    // Save optional new-feature fields (requires migration 014 columns to exist)
    if (staff_member_id || verifiedPromoCode || verifiedDiscount) {
      db.query(
        `UPDATE bookings SET
           staff_member_id = COALESCE($1, staff_member_id),
           promo_code = COALESCE($2, promo_code),
           discount_amount = COALESCE($3, discount_amount)
         WHERE id = $4`,
        [staff_member_id || null, verifiedPromoCode || null, verifiedDiscount || null, booking.id]
      ).catch(() => {});
    }
    // Increment promo uses_count
    if (verifiedPromoCode) {
      db.query(
        `UPDATE promo_codes SET uses_count = uses_count + 1
         WHERE business_id = $1 AND UPPER(code) = UPPER($2)`,
        [req.business.id, verifiedPromoCode]
      ).catch(() => {});
    }

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
    if (err.code === 'SLOT_CONFLICT') return res.status(409).json({ error: err.message });
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
      // Only send review reminder once the appointment time has actually passed.
      // Prevents premature "how was it?" emails when a business confirms a future booking.
      const apptEnd = bookingDateTime(fullBooking.booking_date, fullBooking.end_time || fullBooking.start_time);
      if (apptEnd && apptEnd <= new Date()) {
        sendReviewReminder(fullBooking).catch(() => {});
      }
    }

    // If the business confirms a booking whose appointment has already ended,
    // immediately send the attended email (cron is unreliable on free-tier hosting).
    if (status === 'confirmed' && fullBooking.customer_email) {
      const apptEnd = bookingDateTime(fullBooking.booking_date, fullBooking.end_time || fullBooking.start_time);
      if (apptEnd && apptEnd <= new Date()) {
        db.query('SELECT attended_email_sent_at FROM bookings WHERE id = $1', [fullBooking.id])
          .then(async ({ rows }) => {
            if (rows[0]?.attended_email_sent_at) return; // already sent
            const { rows: scRows } = await db.query('SELECT id FROM service_confirmations WHERE booking_id = $1', [fullBooking.id]);
            if (scRows.length > 0) return; // already confirmed
            const FRONTEND = process.env.FRONTEND_URL || 'https://bookam.business';
            const token = jwt.sign(
              { purpose: 'attended_check', reference_id: fullBooking.reference_id, booking_id: fullBooking.id, consumer_id: fullBooking.consumer_id || null },
              JWT_SECRET, { expiresIn: '7d' }
            );
            await sendAttendedConfirmationEmail(fullBooking,
              `${FRONTEND}/booking/attended?token=${token}&action=confirm`,
              `${FRONTEND}/booking/attended?token=${token}&action=dispute`
            );
            await db.query('UPDATE bookings SET attended_email_sent_at = NOW() WHERE id = $1', [fullBooking.id]);
          })
          .catch(() => {});
      }
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

    const apptDateTime = bookingDateTime(booking.booking_date, booking.start_time, '00:00');
    if (!apptDateTime) return res.status(400).json({ error: 'Booking date is invalid' });
    const hoursUntil = (apptDateTime - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < 0) {
      return res.status(400).json({ error: 'Cannot cancel a booking that has already taken place' });
    }

    // Refund policy: >24h = full, ≤24h = 50%
    const refundPercent = hoursUntil > 24 ? 100 : 50;
    // findByReference returns service_price (joined from services table), not booking.price
    const amountPence   = Math.round(parseFloat(booking.service_price || booking.price || 0) * 100);
    const refundPence   = Math.round(amountPence * refundPercent / 100);
    let   refundIssued  = false;

    if (
      booking.stripe_payment_intent_id &&
      booking.payment_status === 'paid' &&
      refundPence > 0 &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const refundParams = { payment_intent: booking.stripe_payment_intent_id };
        if (refundPercent < 100) refundParams.amount = refundPence;
        await stripe.refunds.create(refundParams);
        await db.query(
          'UPDATE bookings SET payment_status = $1 WHERE id = $2',
          [refundPercent === 100 ? 'refunded' : 'partial_refund', booking.id]
        );
        refundIssued = true;
      } catch (stripeErr) {
        console.error('[cancel/refund]', stripeErr.message);
      }
    }

    await Booking.updateStatus(booking.id, booking.business_id, 'cancelled', 'Cancelled by customer');

    const refundAmountStr = refundPence > 0 ? `£${(refundPence / 100).toFixed(2)}` : null;

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

    if (booking.customer_email) {
      sendBookingStatusUpdate({ ...booking, status: 'cancelled', cancelled_reason: 'Cancelled by customer' }).catch(() => {});
    }

    res.json({
      message: 'Booking cancelled successfully',
      refund_percent:   refundIssued ? refundPercent   : 0,
      refund_amount:    refundIssued ? refundPence / 100 : 0,
      refund_amount_str: refundIssued ? refundAmountStr : null,
    });
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

    // Appointment must have already started before customer can confirm
    const apptEnd = bookingDateTime(booking.booking_date, booking.end_time || booking.start_time);
    if (!apptEnd) return res.status(400).json({ error: 'Booking date is invalid' });
    if (apptEnd > new Date()) {
      return res.status(400).json({ error: 'You can only confirm after your appointment time has passed' });
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

    // Transfer to business via Stripe Connect. Errors are surfaced to admin, never silently lost.
    if (process.env.STRIPE_SECRET_KEY && booking.stripe_payment_intent_id && booking.payment_status === 'paid' && !booking.stripe_transfer_id) {
      transferToBusiness(booking).then(() => {
        // Send payment-released email only after transfer succeeds
        if (booking.business_email) sendBusinessPaymentReleasedEmail(booking).catch(() => {});
      }).catch(err => {
        console.error('[confirmService] transfer failed:', err.message);
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'hello@bookam.business',
          subject: `⚠️ Transfer failed — ${booking.reference_id}`,
          type: 'transfer_failed',
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="color:#dc2626">Stripe Transfer Failed</h2>
            <p>The automatic transfer for booking <strong>${booking.reference_id}</strong> failed and requires manual action.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#64748b;width:130px">Reference</td><td style="font-weight:600;font-family:monospace">${booking.reference_id}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Business</td><td>${booking.business_name}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Customer</td><td>${booking.customer_name}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Error</td><td style="color:#dc2626">${err.message}</td></tr>
            </table>
            <p style="margin-top:16px">Please transfer manually via the <a href="https://dashboard.stripe.com">Stripe dashboard</a>.</p>
          </div>`,
        }).catch(() => {});
      });
    } else if (booking.business_email) {
      // Non-Stripe (cash) bookings — still notify business the service was confirmed
      sendBusinessPaymentReleasedEmail(booking).catch(() => {});
    }

    // Send review reminder to customer
    if (booking.customer_email) sendReviewReminder(booking).catch(() => {});

    res.json({ message: 'Service confirmed — thank you!' });
  } catch (err) {
    console.error('[confirmService]', err.message);
    res.status(500).json({ error: 'Failed to confirm service' });
  }
};

async function transferToBusiness(booking) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  const { rows: bizRows } = await db.query(
    'SELECT stripe_account_id FROM businesses WHERE id = $1',
    [booking.business_id]
  );
  const biz = bizRows[0];
  if (!biz?.stripe_account_id) return; // no Stripe account connected

  // Verify account is active directly from Stripe — never trust the stale DB flag.
  // The DB flag may be false if the business completed onboarding without revisiting Settings.
  const account = await stripe.accounts.retrieve(biz.stripe_account_id);
  if (!account.charges_enabled || !account.payouts_enabled) {
    console.warn(`[stripe-transfer] ${booking.reference_id}: account ${biz.stripe_account_id} not yet active — skipping`);
    return;
  }
  // Keep DB in sync so future checks are consistent
  db.query('UPDATE businesses SET stripe_onboarding_complete = true WHERE stripe_account_id = $1', [biz.stripe_account_id]).catch(() => {});

  // findByReference returns service_price; autoRelease query returns price directly
  const amountPence = Math.round(parseFloat(booking.service_price || booking.price || 0) * 100);
  if (amountPence < 50) return; // free or near-free service

  const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
  const platformFee = Math.round(amountPence * platformFeePercent / 100);
  const transferAmount = amountPence - platformFee;

  // Transfer from platform balance to connected account.
  // We do NOT use source_transaction — it requires the specific charge to be settled
  // in the platform balance first, which can fail for recent payments.
  // Transferring from general platform balance is simpler and more reliable.
  const transfer = await stripe.transfers.create({
    amount:      transferAmount,
    currency:    booking.currency || 'gbp',
    destination: biz.stripe_account_id,
    description: `Payout for booking ${booking.reference_id}`,
    metadata:    { booking_reference: booking.reference_id, booking_id: booking.id },
  });

  await db.query(
    `UPDATE bookings SET stripe_transfer_id = $1, stripe_transfer_status = 'transferred' WHERE id = $2`,
    [transfer.id, booking.id]
  );

  console.log(`[stripe-transfer] £${(transferAmount / 100).toFixed(2)} → ${biz.stripe_account_id} for booking ${booking.reference_id} (transfer ${transfer.id})`);
}

// Finds confirmed+paid bookings whose appointment ended >72h ago with no transfer and auto-releases payment.
async function autoReleaseOverdueBookings() {
  const isPostgres = !!process.env.DATABASE_URL;
  const dateFilter = isPostgres
    ? `(b.booking_date::date + COALESCE(b.end_time, '23:59')::time) < NOW() - INTERVAL '72 hours'`
    : `datetime(substr(b.booking_date, 1, 10) || 'T' || COALESCE(b.end_time, '23:59')) < datetime('now', '-72 hours')`;

  const { rows } = await db.query(`
    SELECT b.id, b.reference_id, b.business_id, b.stripe_payment_intent_id,
           b.payment_status, b.stripe_transfer_id, b.stripe_transfer_status,
           b.booking_date, b.end_time, b.currency,
           s.price
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.status = 'confirmed'
      AND b.payment_status = 'paid'
      AND (b.stripe_transfer_id IS NULL OR b.stripe_transfer_id = '')
      AND (b.stripe_transfer_status IS NULL OR b.stripe_transfer_status = 'pending')
      AND ${dateFilter}
  `);

  let released = 0;
  for (const booking of rows) {
    try {
      await Booking.updateStatus(booking.id, booking.business_id, 'completed', 'Auto-completed after 72h');
      await transferToBusiness(booking);
      released++;
    } catch (err) {
      console.error(`[auto-release] ${booking.reference_id}: ${err.message}`);
    }
  }
  return released;
}

// Exported so other controllers can fire it without going through HTTP
exports.runAutoRelease = () => autoReleaseOverdueBookings().catch(err => { console.error('[auto-release]', err.message); return 0; });

// POST /bookings/admin/auto-release  (admin-authenticated)
exports.autoRelease = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const released = await autoReleaseOverdueBookings();
    res.json({ released, message: `${released} booking${released === 1 ? '' : 's'} auto-released` });
  } catch (err) {
    console.error('[auto-release]', err.message);
    res.status(500).json({ error: 'Auto-release failed' });
  }
};

// POST /bookings/ref/:ref/dispute  (consumer raises a dispute)
exports.raiseDispute = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { reason, description, consumer_id } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required' });

    // Dispute window: must be raised within 6 hours of appointment end time
    const apptEnd = bookingDateTime(booking.booking_date, booking.end_time);
    if (!apptEnd) return res.status(400).json({ error: 'Booking date is invalid' });
    const hoursAfterEnd = (Date.now() - apptEnd.getTime()) / (1000 * 60 * 60);
    if (hoursAfterEnd < 0) {
      return res.status(400).json({ error: 'Cannot raise a dispute for an appointment that has not yet happened' });
    }
    if (hoursAfterEnd > 48) {
      return res.status(400).json({ error: 'Disputes must be raised within 48 hours of your appointment ending' });
    }

    // Fraud guard: max 2 open disputes per consumer at any time
    if (consumer_id) {
      const { rows: openDisputes } = await db.query(
        "SELECT COUNT(*) AS cnt FROM disputes WHERE consumer_id = $1 AND status = 'open'",
        [consumer_id]
      );
      if (parseInt(openDisputes[0].cnt) >= 2) {
        return res.status(400).json({ error: 'You already have 2 open disputes. Please wait for them to be resolved before raising another.' });
      }
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
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin access required' });
  try {
    const { rows } = await db.query(
      `SELECT d.*, b.reference_id, b.booking_date, b.stripe_payment_intent_id, b.payment_status,
              COALESCE(c.full_name, cu.full_name) AS customer_name,
              COALESCE(c.email, cu.email) AS customer_email,
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
    const msg = String(err.message || '').toLowerCase();
    if (err.code === '42p01' || msg.includes('no such table') || msg.includes('does not exist')) {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
};

// POST /bookings/admin/disputes/:id/resolve  (admin only)
exports.resolveDispute = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin access required' });
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

    // Fraud guard: if admin rejects a dispute (customer was wrong), track it on their account.
    // After 3 fraudulent disputes in their history, flag the account for review.
    if (action === 'reject' && dispute.consumer_id) {
      db.query(
        `UPDATE consumer_accounts
         SET fraud_dispute_count = COALESCE(fraud_dispute_count, 0) + 1,
             is_flagged = CASE WHEN COALESCE(fraud_dispute_count, 0) + 1 >= 3 THEN TRUE ELSE is_flagged END,
             flagged_reason = CASE WHEN COALESCE(fraud_dispute_count, 0) + 1 >= 3 THEN 'Multiple fraudulent disputes' ELSE flagged_reason END
         WHERE id = $1`,
        [dispute.consumer_id]
      ).catch(err => console.error('[resolveDispute] fraud tracking error:', err.message));
    }

    res.json({ message: action === 'refund' ? 'Refund issued successfully' : 'Dispute rejected' });
  } catch (err) {
    console.error('[resolveDispute]', err.message);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
};

// Cron: find paid+confirmed bookings whose appointment ended >2h ago with no confirmation/dispute,
// generate a signed token, and email the customer asking if they were attended to.
async function sendAttendedConfirmationEmails() {
  const FRONTEND = process.env.FRONTEND_URL || 'https://bookam.business';
  const isPostgres = !!process.env.DATABASE_URL;
  const dateFilter = isPostgres
    ? `(b.booking_date::date + COALESCE(b.end_time, '23:59')::time) < NOW() - INTERVAL '2 hours'`
    : `datetime(substr(b.booking_date, 1, 10) || 'T' || COALESCE(b.end_time, '23:59')) < datetime('now', '-2 hours')`;

  const { rows } = await db.query(`
    SELECT b.id, b.reference_id, b.business_id, b.stripe_payment_intent_id,
           b.payment_status, b.booking_date, b.end_time, b.start_time, b.currency,
           b.consumer_id,
           c.full_name AS customer_name, c.email AS customer_email,
           s.name AS service_name, s.price,
           biz.name AS business_name, biz.slug, biz.phone AS business_phone
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN customers c ON c.id = b.customer_id
    JOIN businesses biz ON biz.id = b.business_id
    LEFT JOIN service_confirmations sc ON sc.booking_id = b.id
    LEFT JOIN disputes d ON d.booking_id = b.id
    WHERE b.status IN ('confirmed', 'pending')
      AND b.attended_email_sent_at IS NULL
      AND sc.id IS NULL
      AND d.id IS NULL
      AND c.email IS NOT NULL
      AND ${dateFilter}
    LIMIT 50
  `);

  let sent = 0;
  for (const booking of rows) {
    try {
      const token = jwt.sign(
        { purpose: 'attended_check', reference_id: booking.reference_id, booking_id: booking.id, consumer_id: booking.consumer_id || null },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const confirmUrl = `${FRONTEND}/booking/attended?token=${token}&action=confirm`;
      const disputeUrl = `${FRONTEND}/booking/attended?token=${token}&action=dispute`;
      await sendAttendedConfirmationEmail(booking, confirmUrl, disputeUrl);
      await db.query('UPDATE bookings SET attended_email_sent_at = NOW() WHERE id = $1', [booking.id]);
      sent++;
    } catch (err) {
      console.error(`[attended-email] ${booking.reference_id}: ${err.message}`);
    }
  }
  if (sent > 0) console.log(`[attended-email] Sent ${sent} attended confirmation emails`);
  return sent;
}

exports.runAttendedEmails = () => sendAttendedConfirmationEmails().catch(err => { console.error('[attended-email]', err.message); return 0; });

// POST /api/bookings/attended-action  — processes email link with signed JWT token.
// Allows customers to confirm attendance or raise a dispute directly from their email,
// without requiring them to log in. The token was signed when the email was sent.
exports.attendedAction = async (req, res) => {
  const { token, action, reason, description } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  if (!['confirm', 'dispute'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== 'attended_check') throw new Error('wrong purpose');
  } catch {
    return res.status(401).json({ error: 'This link has expired or is invalid. Please contact support.' });
  }

  const booking = await Booking.findByReference(payload.reference_id).catch(() => null);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (action === 'confirm') {
    const { rows: existing } = await db.query('SELECT id FROM service_confirmations WHERE booking_id = $1', [booking.id]);
    if (existing.length > 0) return res.json({ message: 'You have already confirmed this service. Thank you!', already_done: true });

    const { rows: dispRows } = await db.query("SELECT id FROM disputes WHERE booking_id = $1 AND status = 'open'", [booking.id]);
    if (dispRows.length > 0) return res.status(400).json({ error: 'A dispute is open for this booking — contact support.' });

    await db.query('INSERT INTO service_confirmations (id, booking_id, consumer_id) VALUES ($1, $2, $3)',
      [crypto.randomUUID(), booking.id, payload.consumer_id || null]);

    if (booking.status !== 'completed') {
      await Booking.updateStatus(booking.id, booking.business_id, 'completed', null);
    }
    if (process.env.STRIPE_SECRET_KEY && booking.stripe_payment_intent_id && booking.payment_status === 'paid' && !booking.stripe_transfer_id) {
      transferToBusiness(booking).then(() => {
        if (booking.business_email) sendBusinessPaymentReleasedEmail(booking).catch(() => {});
      }).catch(err => {
        console.error('[attendedAction/transfer]', err.message);
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'hello@bookam.business',
          subject: `⚠️ Transfer failed — ${booking.reference_id}`,
          type: 'transfer_failed',
          html: `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#dc2626">Transfer Failed (email link)</h2><p>Booking <strong>${booking.reference_id}</strong> — ${booking.business_name}. Error: ${err.message}</p></div>`,
        }).catch(() => {});
      });
    } else if (booking.business_email) {
      sendBusinessPaymentReleasedEmail(booking).catch(() => {});
    }
    if (booking.customer_email) sendReviewReminder(booking).catch(() => {});

    return res.json({ message: 'Thank you! Your confirmation has been recorded and payment is being released to the business.' });
  }

  // action === 'dispute'
  if (!reason?.trim()) return res.status(400).json({ error: 'Please describe why you were not attended to.' });

  const { rows: confirmRows } = await db.query('SELECT id FROM service_confirmations WHERE booking_id = $1', [booking.id]);
  if (confirmRows.length > 0) return res.status(400).json({ error: 'You already confirmed this service. A dispute cannot be raised.' });

  const { rows: existDisp } = await db.query('SELECT id FROM disputes WHERE booking_id = $1', [booking.id]);
  if (existDisp.length > 0) return res.json({ message: 'A dispute has already been raised for this booking.', already_done: true });

  const consumer_id = payload.consumer_id;
  if (consumer_id) {
    const { rows: openDisputes } = await db.query(
      "SELECT COUNT(*) AS cnt FROM disputes WHERE consumer_id = $1 AND status = 'open'", [consumer_id]
    );
    if (parseInt(openDisputes[0].cnt) >= 2) {
      return res.status(400).json({ error: 'You already have 2 open disputes. Please wait for them to be resolved.' });
    }
  }

  await db.query(
    'INSERT INTO disputes (id, booking_id, consumer_id, reason, description) VALUES ($1, $2, $3, $4, $5)',
    [crypto.randomUUID(), booking.id, consumer_id || null, reason.trim(), description?.trim() || null]
  );

  sendEmail({
    to: process.env.ADMIN_EMAIL || 'hello@bookam.business',
    subject: `New Dispute (via email): ${booking.reference_id}`,
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
      <p style="margin-top:20px"><a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/admin-support">View in admin dashboard →</a></p>
    </div>`,
  }).catch(() => {});

  return res.json({ message: 'Your dispute has been raised. Our team will investigate within 48 hours and payment is held until resolved.' });
};

// POST /bookings/walkin  — business creates walk-in booking from dashboard (authenticated)
exports.createWalkin = async (req, res) => {
  try {
    const { service_id, booking_date, start_time, customer_name, customer_phone, customer_email, notes, staff_member_id } = req.body;
    if (!service_id || !booking_date || !start_time || !customer_name) {
      return res.status(400).json({ error: 'service_id, booking_date, start_time and customer_name are required' });
    }
    const service = await Service.findById(service_id);
    if (!service || service.business_id !== req.business.id || !service.is_active) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const [h, m] = start_time.split(':').map(Number);
    const endMins = h * 60 + m + service.duration_minutes;
    const end_time = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    const customer = await Customer.findOrCreate({
      business_id: req.business.id,
      full_name: customer_name,
      phone: customer_phone || null,
      email: customer_email || null,
    });

    const reference_id = generateReference();
    const booking = await Booking.create({
      reference_id,
      business_id: req.business.id,
      service_id,
      customer_id: customer.id,
      consumer_id: null,
      booking_date,
      start_time,
      end_time,
      notes: notes || null,
      stripe_payment_intent_id: null,
    });

    // Attach staff member if provided
    if (staff_member_id) {
      await db.query('UPDATE bookings SET staff_member_id=$1 WHERE id=$2', [staff_member_id, booking.id]);
    }

    await Customer.incrementBookings(customer.id);
    const fullBooking = await Booking.findByReference(reference_id);

    // Auto-confirm walk-in
    await Booking.updateStatus(fullBooking.id, req.business.id, 'confirmed', null);

    if (customer_email) sendBookingConfirmation({ ...fullBooking, customer_email, status: 'confirmed' }).catch(() => {});

    res.status(201).json({ ...fullBooking, status: 'confirmed' });
  } catch (err) {
    console.error('[walkin]', err.message);
    res.status(500).json({ error: 'Failed to create walk-in booking' });
  }
};

// POST /bookings/ref/:ref/reschedule-request  — consumer requests rescheduling
exports.rescheduleRequest = async (req, res) => {
  try {
    const booking = await Booking.findByReference(req.params.ref);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Verify consumer owns this booking
    let consumerIdFromToken = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const jwt2 = require('jsonwebtoken');
        const p = jwt2.verify(header.split(' ')[1], JWT_SECRET);
        if (p.type === 'consumer') consumerIdFromToken = p.consumerId;
      } catch {}
    }
    if (booking.consumer_id && consumerIdFromToken && booking.consumer_id !== consumerIdFromToken) {
      return res.status(403).json({ error: 'Not your booking' });
    }

    const { preferred_date, preferred_time, message } = req.body;
    if (!preferred_date) return res.status(400).json({ error: 'preferred_date is required' });

    // Store as a note on the booking for now; notify business via notification
    const noteText = `[Reschedule Request] Customer prefers: ${preferred_date}${preferred_time ? ' at ' + preferred_time : ''}${message ? '. Message: ' + message : ''}`;
    await db.query(
      "UPDATE bookings SET notes = COALESCE(notes,'') || $1 WHERE id=$2",
      ['\n' + noteText, booking.id]
    );

    // Notify business owner via email
    if (booking.business_email) {
      sendEmail({
        to: booking.business_email,
        subject: `Reschedule Request: ${booking.customer_name} – ${booking.reference_id}`,
        type: 'reschedule_request',
        business_id: booking.business_id,
        booking_id: booking.id,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:#4f46e5">Reschedule Requested</h2>
          <p><strong>${booking.customer_name}</strong> would like to reschedule.</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            <tr><td style="padding:8px 12px;color:#64748b;background:#f8fafc">Reference</td><td style="padding:8px 12px;font-family:monospace;font-weight:600">${booking.reference_id}</td></tr>
            <tr><td style="padding:8px 12px;color:#64748b">Current date</td><td style="padding:8px 12px">${booking.booking_date}</td></tr>
            <tr><td style="padding:8px 12px;color:#64748b;background:#f8fafc">Preferred date</td><td style="padding:8px 12px;font-weight:600">${preferred_date}${preferred_time ? ' at ' + preferred_time : ''}</td></tr>
            ${message ? `<tr><td style="padding:8px 12px;color:#64748b">Message</td><td style="padding:8px 12px">${message}</td></tr>` : ''}
          </table>
          <p style="margin-top:20px;color:#64748b;font-size:14px">Log in to your dashboard to reschedule this booking.</p>
        </div>`,
      }).catch(() => {});
    }

    res.json({ message: 'Reschedule request sent to the business. They will contact you to confirm.' });
  } catch (err) {
    console.error('[reschedule-request]', err.message);
    res.status(500).json({ error: 'Failed to send reschedule request' });
  }
};
