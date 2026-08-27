/**
 * Retention hooks called after a booking is marked completed.
 * Handles: review token generation, loyalty point award, package/membership usage.
 */
const db = require('../config/database');
const crypto = require('crypto');
const { sendEmail, baseTemplate, detailRow } = require('./emailService');
const loyaltyCtrl = require('../controllers/loyaltyController');

const FRONTEND = process.env.FRONTEND_URL || 'https://bookam.business';

/* ── Generate review token + send request ────────────────────────────────── */

async function sendTokenisedReviewRequest(booking) {
  try {
    // Don't send if already reviewed
    const { rows: existing } = await db.query(
      'SELECT id FROM reviews WHERE booking_id=$1',
      [booking.id]
    );
    if (existing.length) return;

    // Don't send if token already issued for this booking
    const { rows: tokenRows } = await db.query(
      'SELECT id FROM review_tokens WHERE booking_id=$1',
      [booking.id]
    ).catch(() => ({ rows: [] }));
    if (tokenRows.length) return;

    const token = crypto.randomUUID();
    await db.query(
      `INSERT INTO review_tokens (id, token, booking_id, business_id)
       VALUES ($1,$2,$3,$4)`,
      [crypto.randomUUID(), token, booking.id, booking.business_id]
    ).catch(() => {}); // table may not exist on older deploys — fail silently

    const reviewUrl = `${FRONTEND}/review/${token}`;

    if (booking.customer_email) {
      await sendEmail({
        to: booking.customer_email,
        subject: `How was your visit to ${booking.business_name}?`,
        type: 'review_request_token',
        business_id: booking.business_id,
        booking_id: booking.id,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:40px;margin-bottom:12px">⭐</div>
              <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">How was your appointment?</h2>
              <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, we hope your visit to <strong>${booking.business_name}</strong> was great.</p>
            </div>
            <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px">
              <tr style="background:#f8fafc"><td style="padding:12px 16px;color:#64748b;font-size:13px;width:120px">Service</td><td style="padding:12px 16px;font-size:13px;font-weight:600">${booking.service_name || 'Appointment'}</td></tr>
              <tr><td style="padding:12px 16px;color:#64748b;font-size:13px">Date</td><td style="padding:12px 16px;font-size:13px">${booking.booking_date}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:12px 16px;color:#64748b;font-size:13px">Reference</td><td style="padding:12px 16px;font-size:13px;font-family:monospace;color:#4f46e5">${booking.reference_id}</td></tr>
            </table>
            <div style="text-align:center">
              <a href="${reviewUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
                Leave a review →
              </a>
              <p style="margin:16px 0 0;color:#cbd5e1;font-size:11px">This link is personal to you and expires in 30 days.</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[retention/sendReviewRequest]', err.message);
  }
}

/* ── Award loyalty points ─────────────────────────────────────────────────── */

async function awardLoyaltyPoints(booking) {
  try {
    await loyaltyCtrl.awardBookingPoints(
      booking.business_id,
      booking.id,
      booking.customer_id,
      booking.consumer_id,
      parseFloat(booking.amount_paid || booking.deposit_amount || 0)
    );
  } catch (err) {
    console.error('[retention/awardLoyaltyPoints]', err.message);
  }
}

/* ── Main hook: call after any booking → completed transition ─────────────── */

async function onBookingCompleted(booking) {
  if (!booking?.id) return;

  const apptEnd = (() => {
    try {
      const [y, m, d] = booking.booking_date.split('-').map(Number);
      const [h, min] = (booking.end_time || booking.start_time || '00:00').split(':').map(Number);
      return new Date(y, m - 1, d, h, min);
    } catch { return null; }
  })();

  // Only send review request if appointment time has actually passed
  if (!apptEnd || apptEnd <= new Date()) {
    sendTokenisedReviewRequest(booking).catch(() => {});
  }

  awardLoyaltyPoints(booking).catch(() => {});
}

module.exports = { onBookingCompleted, sendTokenisedReviewRequest };
