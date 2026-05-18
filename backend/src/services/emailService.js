const { Resend } = require('resend');
const db = require('../config/database');
const crypto = require('crypto');

const getClient = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const FROM = process.env.EMAIL_FROM || 'BookAm <noreply@bookam.business>';

const logNotification = async (type, business_id, booking_id, recipient, subject, status) => {
  try {
    await db.query(
      `INSERT INTO notification_logs (id, type, business_id, booking_id, recipient, subject, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), type, business_id, booking_id, recipient, subject, status]
    );
  } catch {}
};

const baseTemplate = (content) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px 0;min-height:100vh">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#6d28d9 100%);padding:32px 32px 28px;text-align:center">
        <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779054818/99A671C3-1992-4C69-A170-BB994A854543_tf8sb4.png" alt="BookAm" style="height:36px;width:auto;object-fit:contain;filter:brightness(0) invert(1)" />
      </div>
      <div style="padding:32px">
        ${content}
      </div>
      <div style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;text-align:center">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px">Book. Confirm. Be there.</p>
        <p style="margin:0;color:#cbd5e1;font-size:11px">A <strong>Ralph Lawal Group</strong> product · <a href="https://booking-sepia-nu.vercel.app" style="color:#818cf8;text-decoration:none">bookam.app</a></p>
      </div>
    </div>
  </div>`;

const detailRow = (label, value, shade) =>
  `<tr style="background:${shade ? '#f8fafc' : '#fff'}">
     <td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">${label}</td>
     <td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${value}</td>
   </tr>`;

const sendEmail = async ({ to, subject, html, business_id, booking_id, type }) => {
  const client = getClient();
  if (!client) {
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'skipped_no_key');
    console.log(`[Email skipped – no RESEND_API_KEY] To: ${to} | ${subject}`);
    return;
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html });
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'sent');
  } catch (err) {
    console.error('Email send error:', err.message);
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'failed');
  }
};

const sendBookingConfirmation = (booking) =>
  sendEmail({
    to: booking.customer_email,
    subject: `Booking Received – ${booking.reference_id}`,
    type: 'booking_created',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Booking Received! 🎉</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">Hi ${booking.customer_name}, your booking is pending confirmation. You'll hear back soon.</p>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
        ${detailRow('Business', booking.business_name, true)}
        ${detailRow('Service', booking.service_name, false)}
        ${detailRow('Date', booking.booking_date, true)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, false)}
      </table>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;text-align:center">You'll receive an email once confirmed. For changes, contact the business directly.</p>
    `),
  });

const sendBookingStatusUpdate = (booking) => {
  const configs = {
    confirmed: { label: 'Confirmed ✅', color: '#10b981', emoji: '✅', msg: 'Your appointment is confirmed. See you there!' },
    cancelled: { label: 'Cancelled', color: '#ef4444', emoji: '❌', msg: 'Your booking has been cancelled.' },
    completed: { label: 'Completed', color: '#6366f1', emoji: '✨', msg: 'Thanks for your visit! We hope to see you again.' },
  };
  const cfg = configs[booking.status] || { label: booking.status, color: '#64748b', emoji: '📋', msg: '' };

  return sendEmail({
    to: booking.customer_email,
    subject: `Booking ${cfg.label} – ${booking.reference_id}`,
    type: `booking_${booking.status}`,
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${cfg.color}15;border-radius:50%;font-size:24px;margin-bottom:12px">${cfg.emoji}</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Booking ${cfg.label}</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, ${cfg.msg}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
        ${detailRow('Service', booking.service_name, true)}
        ${detailRow('Date', booking.booking_date, false)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, true)}
      </table>
      ${booking.cancelled_reason ? `<div style="margin:16px 0 0;padding:12px 16px;background:#fef2f2;border-radius:8px;border-left:3px solid #ef4444"><p style="margin:0;color:#dc2626;font-size:13px"><strong>Reason:</strong> ${booking.cancelled_reason}</p></div>` : ''}
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;text-align:center">Questions? Contact ${booking.business_name}${booking.business_phone ? ` at ${booking.business_phone}` : ''}.</p>
    `),
  });
};

const sendOwnerNewBooking = (booking, ownerEmail) =>
  sendEmail({
    to: ownerEmail,
    subject: `New Booking: ${booking.customer_name} – ${booking.reference_id}`,
    type: 'owner_new_booking',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">New Booking 📅</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">You have a new booking request from <strong>${booking.customer_name}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
        ${detailRow('Customer', booking.customer_name, true)}
        ${detailRow('Phone', booking.customer_phone || 'N/A', false)}
        ${detailRow('Service', booking.service_name, true)}
        ${detailRow('Date', booking.booking_date, false)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, true)}
      </table>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;text-align:center">Log in to your dashboard to confirm or manage this booking.</p>
    `),
  });

const sendReminder = (booking, hoursUntil) => {
  const isHour = hoursUntil <= 1;
  const label = isHour ? '1 hour' : '24 hours';
  return sendEmail({
    to: booking.customer_email,
    subject: `Reminder: Your appointment in ${label} – ${booking.reference_id}`,
    type: isHour ? 'reminder_1h' : 'reminder_24h',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#4f46e510;border-radius:50%;font-size:28px;margin-bottom:12px">⏰</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Appointment Reminder</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, your appointment is in <strong>${label}</strong>.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Business', booking.business_name, false)}
        ${detailRow('Service', booking.service_name, true)}
        ${detailRow('Date', booking.booking_date, false)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, true)}
      </table>
      <div style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;text-align:center">
        <p style="margin:0;color:#16a34a;font-size:14px;font-weight:600">Book. Confirm. Be there. ✅</p>
      </div>
    `),
  });
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to BookAm — your booking page awaits',
    type: 'welcome',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:40px;margin-bottom:12px">🎉</div>
        <h2 style="margin:0 0 8px;font-size:24px;color:#1e293b">Welcome to BookAm, ${user.full_name}!</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Your account is ready. Let's get your booking page live.</p>
      </div>
      <div style="space-y:0">
        ${[
          ['1', 'Set up your business profile', 'Add your name, description, and logo.'],
          ['2', 'Add your services', 'List what you offer with pricing and duration.'],
          ['3', 'Set your availability', 'Choose your working days and hours.'],
          ['4', 'Share your booking link', 'Post it anywhere — customers book 24/7.'],
        ].map(([n, title, desc], i) => `
          <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;${i < 3 ? 'border-bottom:1px solid #f1f5f9;' : ''}">
            <div style="width:28px;height:28px;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;line-height:28px;text-align:center">${n}</div>
            <div>
              <p style="margin:0 0 2px;font-weight:600;color:#1e293b;font-size:14px">${title}</p>
              <p style="margin:0;color:#64748b;font-size:13px">${desc}</p>
            </div>
          </div>`).join('')}
      </div>
      <div style="margin:24px 0 0;text-align:center">
        <a href="${process.env.FRONTEND_URL || 'https://booking-sepia-nu.vercel.app'}/admin/onboarding"
           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
          Set Up My Page →
        </a>
      </div>
    `),
  });

module.exports = { sendEmail, sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking, sendReminder, sendWelcomeEmail };
