import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LOGO_BLUE_ICON } from './config/logos';
import LoadingScreen from './components/shared/LoadingScreen';
import FloatingChatWidget from './components/shared/FloatingChatWidget';
import BroadcastBanner from './components/shared/BroadcastBanner';
import CookieConsent from './components/shared/CookieConsent';

// Public pages
import Landing from './pages/public/Landing';
import SignupChooser from './pages/public/SignupChooser';
import BookingPage from './pages/public/BookingPage';
import BookingSuccess from './pages/public/BookingSuccess';
import BookingLookup from './pages/public/BookingLookup';
import VerifyEmail from './pages/public/VerifyEmail';
import LegalPage from './pages/public/LegalPage';

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
import ConsumerMessages from './pages/consumer/ConsumerMessages';
import ConsumerOnboarding from './pages/consumer/ConsumerOnboarding';
import FavouritesPage from './pages/consumer/FavouritesPage';

// Support
import AdminSupport from './pages/support/AdminSupport';

// Admin inbox
import AdminInbox from './pages/admin/AdminInbox';

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

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">Something went wrong</p>
            <p className="text-gray-500 mb-6">An unexpected error occurred. Please try refreshing the page.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }} className="btn-primary">
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const ConsumerProtectedRoute = ({ children }) => {
  const { consumer, loading } = useCustomerAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!consumer) return <Navigate to="/customer/login" replace state={{ from: location }} />;
  return children;
};

const PageLoader = () => <LoadingScreen />;

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <CustomerAuthProvider>
        <NotificationProvider>
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
          <BroadcastBanner />
          <FloatingChatWidget />
          <CookieConsent />
          <Routes>
            {/* Public booking */}
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/booking-success/:ref" element={<BookingSuccess />} />
            <Route path="/booking/lookup" element={<BookingLookup />} />
            <Route path="/legal/:page" element={<LegalPage />} />

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
              <Route path="messages" element={<AdminInbox />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Email verification */}
            <Route path="/verify-email" element={<VerifyEmail type="business" />} />
            <Route path="/customer/verify-email" element={<VerifyEmail type="consumer" />} />

            {/* Consumer pages */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/match" element={<SmartMatchPage />} />
            <Route path="/profile/:slug" element={<BusinessProfile />} />
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer/signup" element={<CustomerSignup />} />
            <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
            <Route path="/customer/reset-password" element={<CustomerResetPassword />} />
            <Route path="/customer/onboarding" element={<ConsumerProtectedRoute><ConsumerOnboarding /></ConsumerProtectedRoute>} />
            <Route path="/customer/dashboard" element={<ConsumerProtectedRoute><CustomerDashboard /></ConsumerProtectedRoute>} />
            <Route path="/customer/messages" element={<ConsumerProtectedRoute><ConsumerMessages /></ConsumerProtectedRoute>} />
            <Route path="/customer/profile" element={<ConsumerProtectedRoute><ConsumerProfile /></ConsumerProtectedRoute>} />
            <Route path="/customer/favourites" element={<ConsumerProtectedRoute><FavouritesPage /></ConsumerProtectedRoute>} />
            <Route path="/admin-support" element={<AdminSupport />} />

            {/* Account type chooser */}
            <Route path="/signup" element={<SignupChooser />} />

            {/* Landing */}
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
        </NotificationProvider>
      </CustomerAuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 dark:bg-gray-950 text-center px-4 animate-fade-in">
    <img src={LOGO_BLUE_ICON} alt="BookAm Business" className="w-12 h-12 object-contain opacity-40 dark:brightness-0 dark:invert dark:opacity-30" />
    <div>
      <div className="text-7xl font-black text-primary-600 dark:text-primary-400 leading-none mb-3">404</div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">This page doesn't exist.</p>
    </div>
    <Link to="/" className="btn-primary">Back to home</Link>
  </div>
);
