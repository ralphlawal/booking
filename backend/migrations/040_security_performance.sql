-- Query paths used by calendars, customer history, reviews, and waitlist queues.
-- These indexes also preserve the business_id predicate that enforces tenant scope.
CREATE INDEX IF NOT EXISTS idx_bookings_business_status_date
  ON bookings(business_id, status, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_business_date
  ON bookings(customer_id, business_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_business_active_slot
  ON bookings(business_id, booking_date, start_time)
  WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_reviews_business_created
  ON reviews(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_business_status_created
  ON waitlist(business_id, status, created_at DESC);
