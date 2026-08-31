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
        <img src="https://res.cloudinary.com/dco9drzzp/image/upload/v1779210788/IMG_0364_cgkeo4.png" alt="BookAm Business" style="height:36px;width:auto;object-fit:contain;filter:brightness(0) invert(1)" />
      </div>
      <div style="padding:32px">
        ${content}
      </div>
      <div style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;text-align:center">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px">Book. Confirm. Be there.</p>
        <p style="margin:0;color:#cbd5e1;font-size:11px">A <a href="https://www.ralphlawalgroup.com" style="color:#818cf8;text-decoration:none;font-weight:600">Ralph Lawal Group</a> product · <a href="https://www.bookam.business" style="color:#818cf8;text-decoration:none">bookam.business</a></p>
      </div>
    </div>
  </div>`;

const detailRow = (label, value, shade) =>
  `<tr style="background:${shade ? '#f8fafc' : '#fff'}">
     <td style="padding:10px 14px;color:#64748b;font-size:14px;width:40%">${label}</td>
     <td style="padding:10px 14px;color:#1e293b;font-size:14px;font-weight:500">${value}</td>
   </tr>`;

const sendEmail = async ({ to, subject, html, business_id, booking_id, type, from }) => {
  const client = getClient();
  if (!client) {
    await logNotification(type || 'email', business_id, booking_id, to, subject, 'skipped_no_key');
    console.log(`[Email skipped – no RESEND_API_KEY] To: ${to} | ${subject}`);
    return;
  }
  try {
    await client.emails.send({ from: from || FROM, to, subject, html });
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
      ${booking.status === 'confirmed' ? `<div style="margin:20px 0 0;padding:14px 16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;text-align:center"><p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:600">After your appointment</p><p style="margin:0;color:#15803d;font-size:13px">We'll email you to confirm the service was completed. You can also confirm (or raise an issue) anytime from your <a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/customer/dashboard" style="color:#16a34a;font-weight:600">BookAm dashboard</a>.</p></div>` : ''}
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

const sendBookingRescheduled = (booking) =>
  sendEmail({
    to: booking.customer_email,
    subject: `Booking Rescheduled – ${booking.reference_id}`,
    type: 'booking_rescheduled',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#4f46e510;border-radius:50%;font-size:24px;margin-bottom:12px">📅</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Booking Rescheduled</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, your appointment has been rescheduled to a new time.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
        ${detailRow('Service', booking.service_name, true)}
        ${detailRow('New Date', booking.booking_date, false)}
        ${detailRow('New Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, true)}
      </table>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;text-align:center">Questions? Contact ${booking.business_name}${booking.business_phone ? ` at ${booking.business_phone}` : ''}.</p>
    `),
  });

// A personal note from the founder, sent once the email is verified (the
// "account fully opened" moment). Deliberately plain and human — no big header
// banner — and sent from ralph@bookam.business so replies reach a real inbox.
const RALPH_FROM = 'Ralph Lawal <ralph@bookam.business>';

const sendRalphWelcomeEmail = (recipient, kind = 'business') => {
  const firstName = (recipient.full_name || '').trim().split(/\s+/)[0] || 'there';
  const isBiz = kind === 'business';
  const ctaUrl = `${process.env.FRONTEND_URL || 'https://bookam.business'}${isBiz ? '/admin/onboarding' : '/explore'}`;
  const ctaLabel = isBiz ? 'Set up my booking page' : 'Find somewhere to book';

  const body = isBiz
    ? `
      <p>Hi ${firstName},</p>
      <p>You verified your email, which means you've now done more setup than roughly half the internet. Genuinely — well done.</p>
      <p>I'm Ralph, I built BookAm. The reason it exists: I got tired of watching brilliant people — barbers, stylists, cleaners, coaches — lose half their week to "hey are you free Saturday?" and the client who books, vanishes, and never texts back.</p>
      <p>So here's the deal from my side:</p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:15px;line-height:1.7">
        <li>You get a booking page that works while you sleep.</li>
        <li>Deposits so no-shows cost <em>them</em>, not you.</li>
        <li>Money that lands in your account automatically after each appointment.</li>
        <li>Me, actually reading replies to this email. Tell me what's broken, what's missing, what would make you switch for good. I ship fixes weekly.</li>
      </ul>
      <p>It's early, it's improving fast, and you're in before the crowd. Let's get your page live.</p>
    `
    : `
      <p>Hi ${firstName},</p>
      <p>Email verified. That's the hard part done — the rest is just booking nice things for yourself.</p>
      <p>I'm Ralph, I built BookAm. I wanted one place to book a haircut, a massage, a deep clean — without the DMs, the "call to confirm", and the guessing whether they're even open.</p>
      <p>What you get:</p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:15px;line-height:1.7">
        <li>Book real local businesses in a couple of taps, any time.</li>
        <li>Everything you've booked in one place, with reminders so you actually show up.</li>
        <li>Reviews you can trust, because they're from people who actually went.</li>
      </ul>
      <p>We're new and getting better every week. If something annoys you, hit reply — it comes straight to me.</p>
    `;

  return sendEmail({
    to: recipient.email,
    from: RALPH_FROM,
    subject: isBiz ? `${firstName}, welcome to BookAm (a note from me)` : `Welcome to BookAm, ${firstName} 👋`,
    type: 'ralph_welcome',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:32px 16px">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px 28px 24px">
          ${body}
          <p style="margin:20px 0 4px">
            <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">${ctaLabel} →</a>
          </p>
          <p style="margin:22px 0 0;color:#334155;font-size:15px">— Ralph<br/>
            <span style="color:#94a3b8;font-size:13px">Founder, BookAm · just reply to this email</span>
          </p>
        </div>
      </div>`,
  });
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to BookAm Business — your booking page awaits',
    type: 'welcome',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:40px;margin-bottom:12px">🎉</div>
        <h2 style="margin:0 0 8px;font-size:24px;color:#1e293b">Welcome to BookAm Business, ${user.full_name}!</h2>
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
        <a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/admin/onboarding"
           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
          Set Up My Page →
        </a>
      </div>
    `),
  });

const sendReviewReminder = (booking) => {
  const FRONTEND = process.env.FRONTEND_URL || 'https://bookam.business';
  const reviewLink = booking.slug
    ? `${FRONTEND}/profile/${booking.slug}#reviews`
    : `${FRONTEND}/explore`;
  return sendEmail({
    to: booking.customer_email,
    subject: `How was your visit to ${booking.business_name}?`,
    type: 'review_reminder',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:40px;margin-bottom:12px">⭐</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">How was your appointment?</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, we hope your visit to <strong>${booking.business_name}</strong> went well.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px">
        ${detailRow('Service', booking.service_name, false)}
        ${detailRow('Date', booking.booking_date, true)}
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
      </table>
      <div style="text-align:center">
        <p style="color:#64748b;font-size:14px;margin:0 0 16px">Your review helps others find great local services.</p>
        <a href="${reviewLink}"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
          Leave a review →
        </a>
      </div>
      <p style="margin:20px 0 0;color:#cbd5e1;font-size:12px;text-align:center">This is a one-time message. You won't receive reminders for this booking again.</p>
    `),
  });
};

const sendAttendedConfirmationEmail = (booking, confirmUrl, disputeUrl) =>
  sendEmail({
    to: booking.customer_email,
    subject: `Were you attended to? – ${booking.reference_id}`,
    type: 'attended_confirmation',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:40px;margin-bottom:12px">🙋</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Were you attended to?</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${booking.customer_name}, your appointment at <strong>${booking.business_name}</strong> was scheduled for today.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px">
        ${detailRow('Service', booking.service_name, false)}
        ${detailRow('Date', booking.booking_date, true)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, false)}
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, true)}
      </table>
      <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 20px">Please let us know — your response releases payment to the business or opens a refund investigation. You have 6 hours from your appointment end time to respond.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:0 6px 0 0;width:50%">
            <a href="${confirmUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 12px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">
              ✅ Yes, I was attended to
            </a>
          </td>
          <td style="padding:0 0 0 6px;width:50%">
            <a href="${disputeUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:14px 12px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">
              ❌ No, I wasn't attended to
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;color:#cbd5e1;font-size:12px;text-align:center">These links expire in 7 days. If you have already responded, you can safely ignore this email.</p>
    `),
  });

const sendVerificationEmail = (user, verifyUrl, type = 'business') =>
  sendEmail({
    to: user.email,
    subject: 'Verify your BookAm Business email',
    type: 'email_verification',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,#4f46e5,#6d28d9);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:24px">✉️</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b">Confirm your email</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${user.full_name || user.email}, click below to verify your email address.</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
          Verify my email →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `),
  });

const sendBusinessPaymentReleasedEmail = (booking) =>
  sendEmail({
    to: booking.business_email,
    subject: `Payment released — ${booking.customer_name} confirmed service · ${booking.reference_id}`,
    type: 'business_payment_released',
    business_id: booking.business_id,
    booking_id: booking.id,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#10b98115;border-radius:50%;font-size:24px;margin-bottom:12px">💰</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">Payment Released</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Your customer confirmed the service was completed.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
        ${detailRow('Reference', `<span style="font-family:monospace;color:#4f46e5">${booking.reference_id}</span>`, false)}
        ${detailRow('Customer', booking.customer_name, true)}
        ${detailRow('Service', booking.service_name, false)}
        ${detailRow('Date', booking.booking_date, true)}
        ${detailRow('Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`, false)}
        ${booking.service_price || booking.price ? detailRow('Amount', `£${parseFloat(booking.service_price || booking.price).toFixed(2)}`, true) : ''}
      </table>
      <div style="margin:20px 0 0;padding:14px 16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;text-align:center">
        <p style="margin:0;color:#166534;font-size:14px;font-weight:600">Payment is on its way to your account</p>
        <p style="margin:6px 0 0;color:#15803d;font-size:13px">Transfers typically arrive within 2–5 business days depending on your bank.</p>
      </div>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;text-align:center">Log in to your <a href="${process.env.FRONTEND_URL || 'https://bookam.business'}/admin/dashboard" style="color:#4f46e5">dashboard</a> to view your bookings.</p>
    `),
  });

const sendWaitlistNotification = ({ consumer_name, consumer_email, business_name, service_name, business_slug }) => {
  const bookUrl = `${process.env.FRONTEND_URL || 'https://bookam.business'}/book/${business_slug}`;
  return sendEmail({
    to: consumer_email,
    subject: `A slot just opened at ${business_name}`,
    type: 'waitlist_notified',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#ede9fe;border-radius:50%;font-size:24px;margin-bottom:12px">🔔</div>
        <h2 style="margin:0 0 6px;font-size:22px;color:#1e293b">A slot is open!</h2>
        <p style="margin:0;color:#64748b;font-size:15px">Hi ${consumer_name}, a spot has just opened up at <strong>${business_name}</strong>${service_name ? ` for ${service_name}` : ''}.</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${bookUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none">Book now →</a>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center">Slots fill up fast — book before it's gone. This notification was sent because you joined the waitlist for ${business_name}.</p>
    `),
  });
};

const sendEmailOtpCode = (user, otp, purpose = 'verify') => {
  const isLogin = purpose === 'login';
  const subject = isLogin
    ? `Your BookAm sign-in code: ${otp}`
    : `Your BookAm verification code: ${otp}`;
  const heading = isLogin ? 'Your sign-in code' : 'Verify your email';
  const subtext = isLogin
    ? `Hi${user.full_name ? ` ${user.full_name}` : ''}, use this code to sign in to your BookAm Business account.`
    : `Hi${user.full_name ? ` ${user.full_name}` : ''}, enter this code to verify your email and activate your account.`;

  return sendEmail({
    to: user.email,
    subject,
    type: isLogin ? 'login_otp' : 'email_otp',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,#4f46e5,#6d28d9);border-radius:50%;margin:0 auto 16px;line-height:56px;font-size:26px">
          🔐
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b">${heading}</h2>
        <p style="margin:0;color:#64748b;font-size:15px">${subtext}</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <div style="display:inline-block;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:16px;padding:20px 40px">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Your code</p>
          <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#4f46e5;font-family:monospace">${otp}</p>
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
};

module.exports = { sendEmail, sendBookingConfirmation, sendBookingStatusUpdate, sendOwnerNewBooking, sendReminder, sendWelcomeEmail, sendRalphWelcomeEmail, sendBookingRescheduled, sendReviewReminder, sendAttendedConfirmationEmail, sendVerificationEmail, sendEmailOtpCode, sendBusinessPaymentReleasedEmail, sendWaitlistNotification };
