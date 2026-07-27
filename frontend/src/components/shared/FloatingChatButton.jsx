import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Hide on pages that have their own chat UI or bottom nav
const HIDE_ON_PREFIXES = [
  '/customer/messages',
  '/customer/',
  '/feed',
  '/explore',
  '/match',
  '/profile',
  '/admin/',
  '/admin/messages',
  '/admin/dashboard',
  '/admin/bookings',
  '/admin/calendar',
  '/admin/services',
  '/admin/customers',
  '/admin/settings',
  '/admin/onboarding',
  '/admin-support',
];

export default function FloatingChatButton() {
  const { pathname } = useLocation();
  const hide = HIDE_ON_PREFIXES.some(p => pathname === p || pathname.startsWith(p));
  if (hide) return null;

  return (
    <a
      href="mailto:hello@bookam.business"
      title="Contact BookAm Support — hello@bookam.business"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl shadow-xl shadow-primary-600/30 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl text-sm font-semibold"
    >
      <MessageSquare className="w-5 h-5 flex-shrink-0" />
      <span className="hidden sm:inline">Contact support</span>
      <span className="sm:hidden text-xs">Help</span>
    </a>
  );
}
