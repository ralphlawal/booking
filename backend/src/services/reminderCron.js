const db = require('../config/database');
const emailService = require('./emailService');
const { notifyUser } = require('./pushService');

// Find bookings that need a reminder sent right now
// Runs every 5 minutes. Sends reminders at:
//   - 24 hours before appointment
//   - 2 hours before appointment
async function sendReminders() {
  try {
    const now = new Date();

    // Build target windows: [22h-24h from now] and [1h45m-2h from now]
    const windows = [
      { label: '24h', hoursAhead: 24, windowMinutes: 30, reminderType: 'reminder_24h' },
      { label: '2h',  hoursAhead: 2,  windowMinutes: 15, reminderType: 'reminder_2h'  },
    ];

    for (const w of windows) {
      const from = new Date(now.getTime() + (w.hoursAhead * 60 - w.windowMinutes) * 60000);
      const to   = new Date(now.getTime() + (w.hoursAhead * 60) * 60000);

      const fromDate = from.toISOString().slice(0, 10);
      const toDate   = to.toISOString().slice(0, 10);
      const fromTime = from.toTimeString().slice(0, 5);
      const toTime   = to.toTimeString().slice(0, 5);

      const { rows } = await db.query(
        `SELECT
           b.id, b.booking_date, b.start_time, b.customer_email, b.customer_name,
           b.consumer_id, b.business_id,
           s.name AS service_name,
           biz.name AS business_name, biz.location AS business_location
         FROM bookings b
         LEFT JOIN services s   ON s.id = b.service_id
         LEFT JOIN businesses biz ON biz.id = b.business_id
         WHERE b.status IN ('confirmed', 'pending')
           AND b.payment_status != 'failed'
           AND b.booking_date BETWEEN $1 AND $2
           AND b.start_time::time BETWEEN $3::time AND $4::time
           AND NOT EXISTS (
             SELECT 1 FROM notification_logs nl
             WHERE nl.booking_id = b.id AND nl.type = $5
           )`,
        [fromDate, toDate, fromTime, toTime, w.reminderType]
      );

      for (const booking of rows) {
        try {
          const when = w.label === '24h' ? 'tomorrow' : 'in 2 hours';
          const timeStr = booking.start_time?.slice(0, 5) || '';

          // Email reminder
          if (booking.customer_email) {
            await emailService.sendEmail({
              to: booking.customer_email,
              subject: `Reminder: Your ${booking.service_name} appointment ${when}`,
              html: `
                <p>Hi ${booking.customer_name || 'there'},</p>
                <p>This is a reminder that you have a <strong>${booking.service_name}</strong> appointment
                   at <strong>${booking.business_name}</strong> on
                   <strong>${booking.booking_date}</strong> at <strong>${timeStr}</strong>.</p>
                ${booking.business_location ? `<p>Location: ${booking.business_location}</p>` : ''}
                <p>If you need to cancel or reschedule, please do so as soon as possible.</p>
              `,
            });
          }

          // Push notification
          if (booking.consumer_id) {
            await notifyUser('consumer', booking.consumer_id, {
              title: `Appointment ${when}`,
              body: `${booking.service_name} at ${booking.business_name} — ${booking.booking_date} ${timeStr}`,
              data: { url: '/customer/dashboard', bookingId: booking.id },
            });
          }

          // Log so we don't send twice
          await db.query(
            `INSERT INTO notification_logs (id, type, business_id, booking_id, recipient, subject, status)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'sent')
             ON CONFLICT DO NOTHING`,
            [w.reminderType, booking.business_id, booking.id, booking.customer_email || booking.consumer_id, `Reminder ${w.label}`]
          );

          console.log(`[Reminders] Sent ${w.label} reminder for booking ${booking.id}`);
        } catch (err) {
          console.error(`[Reminders] Failed for booking ${booking.id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[Reminders] Cron error:', err.message);
  }
}

function startReminderCron() {
  // Run immediately on startup, then every 5 minutes
  sendReminders();
  setInterval(sendReminders, 5 * 60 * 1000);
  console.log('[Reminders] Cron started — checking every 5 minutes');
}

module.exports = { startReminderCron, sendReminders };
