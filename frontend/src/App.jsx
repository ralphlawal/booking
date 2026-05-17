import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import BookingPage from './pages/public/BookingPage';
import BookingSuccess from './pages/public/BookingSuccess';

// Auth pages
import Login from './pages/admin/Login';
import Register from './pages/admin/Register';

// Admin pages
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Services from './pages/admin/Services';
import Bookings from './pages/admin/Bookings';
import Calendar from './pages/admin/Calendar';
import Customers from './pages/admin/Customers';
import Settings from './pages/admin/Settings';
import Onboarding from './pages/admin/Onboarding';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium">Loading Bookly…</p>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public booking */}
          <Route path="/book/:slug" element={<BookingPage />} />
          <Route path="/booking-success/:ref" element={<BookingSuccess />} />

          {/* Auth */}
          <Route path="/admin/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/admin/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/admin/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
    <div className="text-6xl font-bold text-primary-600">404</div>
    <p className="text-gray-500">Page not found</p>
    <a href="/" className="btn-primary">Go Home</a>
  </div>
);
