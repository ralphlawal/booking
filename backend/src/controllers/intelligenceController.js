const db = require('../config/database');

const num = v => Number(v || 0);

exports.overview = async (req, res) => {
  try {
    const id = req.business.id;
    const [weekly, services, customers, staff, cancellations, slots, due] = await Promise.all([
      db.query(`SELECT COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE-INTERVAL '7 days') AS current, COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE-INTERVAL '14 days' AND booking_date < CURRENT_DATE-INTERVAL '7 days') AS previous, COALESCE(SUM(s.price) FILTER (WHERE b.booking_date >= CURRENT_DATE-INTERVAL '7 days' AND b.status IN ('confirmed','completed')),0) AS revenue FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.business_id=$1`, [id]),
      db.query(`SELECT s.id,s.name,COUNT(b.id) FILTER (WHERE b.status IN ('confirmed','completed')) AS bookings,COALESCE(SUM(s.price) FILTER (WHERE b.status IN ('confirmed','completed')),0) AS revenue FROM services s LEFT JOIN bookings b ON b.service_id=s.id WHERE s.business_id=$1 GROUP BY s.id ORDER BY revenue DESC LIMIT 8`, [id]),
      db.query(`SELECT c.id,c.full_name,COALESCE(SUM(s.price) FILTER (WHERE b.status='completed'),0) AS lifetime_value,MAX(b.booking_date) AS last_visit FROM customers c LEFT JOIN bookings b ON b.customer_id=c.id LEFT JOIN services s ON s.id=b.service_id WHERE c.business_id=$1 GROUP BY c.id ORDER BY lifetime_value DESC LIMIT 10`, [id]),
      db.query(`SELECT sm.id,sm.name,COUNT(b.id) FILTER (WHERE b.status IN ('confirmed','completed') AND b.booking_date >= CURRENT_DATE-INTERVAL '30 days') AS bookings FROM staff_members sm LEFT JOIN bookings b ON b.staff_member_id=sm.id WHERE sm.business_id=$1 AND sm.is_active=TRUE GROUP BY sm.id ORDER BY bookings DESC`, [id]),
      db.query(`SELECT COUNT(*) FILTER (WHERE status='cancelled' AND booking_date >= CURRENT_DATE-INTERVAL '30 days') AS cancelled, COUNT(*) FILTER (WHERE status='no_show' AND booking_date >= CURRENT_DATE-INTERVAL '30 days') AS no_shows, COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE-INTERVAL '30 days') AS total FROM bookings WHERE business_id=$1`, [id]),
      db.query(`SELECT opening_time,closing_time,slot_interval_minutes,working_days FROM availability_settings WHERE business_id=$1`, [id]),
      db.query(`SELECT COUNT(*) AS count FROM customers c WHERE c.business_id=$1 AND EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id=c.id) AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id=c.id AND b.booking_date >= CURRENT_DATE-INTERVAL '30 days')`, [id]),
    ]);
    const w = weekly.rows[0]; const current = num(w.current), previous = num(w.previous);
    const recommendations = [];
    if (previous >= 3 && current < previous) recommendations.push({ text: `Bookings are down ${Math.round((1-current/previous)*100)}% versus the previous week (${current} vs ${previous}).`, action: 'view_bookings' });
    if (num(due.rows[0].count)) recommendations.push({ text: `${due.rows[0].count} customers have not returned in 30+ days.`, action: 'message_customers' });
    const top = services.rows[0]; if (top && num(top.bookings) >= 3) recommendations.push({ text: `${top.name} is your highest-revenue service at ${num(top.revenue).toFixed(2)}.`, action: 'adjust_service', service_id: top.id });
    if (!slots.rows[0]) recommendations.push({ text: 'Add your availability to calculate empty slots and occupancy.', action: 'open_availability' });
    res.json({ sufficient_data: current + previous >= 3, insights: { revenue_7d: num(w.revenue), booking_trend: { current, previous, change_percent: previous ? Math.round((current-previous)/previous*100) : null }, popular_services: services.rows.map(x => ({ ...x, bookings: num(x.bookings), revenue: num(x.revenue) })), highest_value_customers: customers.rows.map(x => ({ ...x, lifetime_value: num(x.lifetime_value) })), staff_performance: staff.rows.map(x => ({ ...x, bookings: num(x.bookings) })), cancellation_trends: { cancelled: num(cancellations.rows[0].cancelled), no_shows: num(cancellations.rows[0].no_shows), total: num(cancellations.rows[0].total) }, customers_due: num(due.rows[0].count) }, recommendations });
  } catch (err) { console.error('[intelligence]', err.message); res.status(500).json({ error: 'Unable to calculate intelligence insights' }); }
};
