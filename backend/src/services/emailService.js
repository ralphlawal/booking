const nodemailer = require('nodemailer');
const db = require('../config/database');

const createTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const crypto = require('crypto');

const logNotification = async (type, business_id, booking_id, recipient, subject, status) => {
  try {
    await db.query(
      `INSERT INTO notification_logs (id, type, business_id, booking_id, recipient, subject, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), type, business_id, booking_id, recipient, subject, status]
    );
  } catch {}
};

const sendEmail = async ({ to, subject, html, business_id, booking_id, type }) => {
  const transporter = createTransporter();
  if (!transporter) {
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'skipped_no_smtp');
    console.log(`[Email skipped - no SMTP] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Bookly <noreply@bookly.com>',
      to,
      subject,
      html,
    });
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'sent');
  } catch (err) {
    console.error('Email send error:', err.message);
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'failed');
  }
};

const sendBookingConfirmation = (booking) =>
  sendEmail({
    to: booking.customer_email,
    subject: `Booking Confirmed – ${booking.reference_id}`,
    type: 'booking_created',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#4f46e5">Booking Received!</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>Your booking has been received and is pending confirmation.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Reference</td><td style="padding:8px;font-weight:600">${booking.reference_id}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Business</td><td style="padding:8px">${booking.business_name}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Service</td><td style="padding:8px">${booking.service_name}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px">${booking.booking_date}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Time</td><td style="padding:8px">${booking.start_time} – ${booking.end_time}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px">You will be notified once your booking is confirmed.</p>
      </div>`,
  });

const sendBookingStatusUpdate = (booking) => {
  const statusLabels = { confirmed: 'Confirmed ✅', cancelled: 'Cancelled ❌', completed: 'Completed' };
  return sendEmail({
    to: booking.customer_email,
    subject: `Booking ${statusLabels[booking.status] || booking.status} – ${booking.reference_id}`,
    type: `booking_${booking.status}`,
    business_id: booking.business_id,
    booking_id: booking.id,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#4f46e5">Booking ${statusLabels[booking.status] || booking.status}</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>Your booking <strong>${booking.reference_id}</strong> has been <strong>${booking.status}</strong>.</p>
        ${booking.cancelled_reason ? `<p>Reason: ${booking.cancelled_reason}</p>` : ''}
        <p>For questions, contact ${booking.business_name} at ${booking.business_phone || booking.business_email || 'the business directly'}.</p>
      </div>`,
  });
};

const sendOwnerNewBooking = (booking, ownerEmail) =>
  sendEmail({
    to: ownerEmail,
    subject: `New Booking: ${booking.customer_name} – ${booking.reference_id}`,
    type: 'owner_new_booking',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#4f46e5">New Booking Received</h2>
        <p>You have a new booking from <strong>${booking.customer_name}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Reference</td><td style="padding:8px;font-weight:600">${booking.reference_id}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Service</td><td style="padding:8px">${booking.service_name}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px">${booking.booking_date}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Time</td><td style="padding:8px">${booking.start_time} – ${booking.end_time}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Phone</td><td style="padding:8px">${booking.customer_phone || 'N/A'}</td></tr>
        </table>
      </div>`,
  });

module.exports = { sendEmail, sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking };
