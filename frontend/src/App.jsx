import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { LOGO_BLUE_ICON } from './config/logos';

// Public pages
import Landing from './pages/public/Landing';
import BookingPage from './pages/public/BookingPage';
import BookingSuccess from './pages/public/BookingSuccess';
import BookingLookup from './pages/public/BookingLookup';

// Consumer pages
import ExplorePage from './pages/consumer/ExplorePage';
import SmartMatchPage from './pages/consumer/SmartMatchPage';
import CustomerLogin from './pages/consumer/CustomerLogin';
import CustomerSignup from './pages/consumer/CustomerSignup';
import CustomerForgotPassword from './pages/consumer/CustomerForgotPassword';
import CustomerResetPassword from './pages/consumer/CustomerResetPassword';
import CustomerDashboard from './pages/consumer/CustomerDashboard';
import BusinessProfile from './pages/consumer/BusinessProfile';
import ConsumerProfile from './pages/consumer/ConsumerProfile';

// Auth pages
import Login from './pages/admin/Login';
import Register from './pages/admin/Register';
import ForgotPassword from './pages/admin/ForgotPassword';
import ResetPassword from './pages/admin/ResetPassword';

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
  <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
    <div className="flex flex-col items-center gap-5 animate-fade-in">
      <img src={LOGO_BLUE_ICON} alt="BookAm" className="w-12 h-12 object-contain dark:brightness-0 dark:invert animate-pulse" />
      <div className="flex items-center gap-1.5">
        {[0, 120, 240].map(d => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary-400" style={{ animation: `bounce 0.9s ease-in-out ${d}ms infinite` }} />
        ))}
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <CustomerAuthProvider>
        <AuthProvider>
          <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public booking */}
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/booking-success/:ref" element={<BookingSuccess />} />
            <Route path="/booking/lookup" element={<BookingLookup />} />

            {/* Auth */}
            <Route path="/admin/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/admin/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/admin/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
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

            {/* Consumer pages */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/match" element={<SmartMatchPage />} />
            <Route path="/profile/:slug" element={<BusinessProfile />} />
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer/signup" element={<CustomerSignup />} />
            <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
            <Route path="/customer/reset-password" element={<CustomerResetPassword />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/profile" element={<ConsumerProfile />} />

            {/* Landing */}
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </CustomerAuthProvider>
    </ThemeProvider>
  );
}

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 dark:bg-gray-950 text-center px-4 animate-fade-in">
    <img src={LOGO_BLUE_ICON} alt="BookAm" className="w-12 h-12 object-contain opacity-40 dark:brightness-0 dark:invert dark:opacity-30" />
    <div>
      <div className="text-7xl font-black text-primary-600 dark:text-primary-400 leading-none mb-3">404</div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">This page doesn't exist.</p>
    </div>
    <Link to="/" className="btn-primary">Back to home</Link>
  </div>
);
