import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingsAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function BookingSuccess() {
  const { ref } = useParams();
  const { consumer } = useCustomerAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    bookingsAPI.getByRef(ref)
      .then(b => { setBooking(b); if (b.status === 'cancelled') setCancelled(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ref]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingsAPI.cancelByCustomer(ref);
      setCancelled(true);
      setBooking(b => ({ ...b, status: 'cancelled' }));
      toast.success('Booking cancelled successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold">Booking not found</p>
        <p className="text-gray-500 mt-2">Reference: {ref}</p>
      </div>
    </div>
  );

  const whatsappMsg = encodeURIComponent(
    `Hello, I booked ${booking.service_name} for ${booking.booking_date} at ${booking.start_time?.slice(0,5)}. My booking ID is ${booking.reference_id}.`
  );
  const whatsappNum = booking.business_phone?.replace(/\D/g, '');
  const whatsappLink = whatsappNum
    ? `https://wa.me/${whatsappNum}?text=${whatsappMsg}`
    : `https://wa.me/?text=${whatsappMsg}`;

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr + 'T00:00:00'), 'EEEE, MMMM d, yyyy'); }
    catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Received!</h1>
          <p className="text-gray-500 mt-1">Your appointment has been requested</p>
        </div>

        {/* Booking card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Reference */}
          <div className="bg-primary-600 px-5 py-4 text-center">
            <p className="text-primary-200 text-xs font-medium mb-1">Booking Reference</p>
            <p className="text-white text-2xl font-mono font-bold tracking-wider">{booking.reference_id}</p>
          </div>

          {/* Details */}
          <div className="p-5 space-y-3">
            {[
              ['Business', booking.business_name],
              ['Service', booking.service_name],
              ['Date', formatDate(booking.booking_date)],
              ['Time', `${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)}`],
              ['Status', <span key="s" className="badge-pending capitalize">{booking.status}</span>],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}

            {(booking.business_phone || booking.business_email) && (
              <div className="pt-3 mt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Contact Business</p>
                {booking.business_phone && <p className="text-sm">{booking.business_phone}</p>}
                {booking.business_email && <p className="text-sm text-gray-500">{booking.business_email}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
          >
            <WhatsAppIcon />
            Message on WhatsApp
          </a>

          {booking.slug && (
            <Link to={`/book/${booking.slug}`} className="btn-secondary w-full justify-center">
              Book Another Appointment
            </Link>
          )}

          {!cancelled && booking.status !== 'completed' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-2.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel this booking'}
            </button>
          )}
        </div>

        {/* Consumer CTA — only shown when not logged in */}
        {!consumer && (
          <div className="mt-5 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-2xl text-center">
            <p className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-1">
              Track this booking in your account
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mb-3">
              Create a free account to manage bookings, rebook with one tap, and leave reviews.
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/customer/signup" className="btn-primary text-xs py-2 px-4">
                Create account
              </Link>
              <Link to="/customer/login" className="btn-secondary text-xs py-2 px-4">
                Sign in
              </Link>
            </div>
          </div>
        )}

        {consumer && (
          <Link
            to="/customer/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            View in My Bookings →
          </Link>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Save your reference ID: <strong>{booking.reference_id}</strong>
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
