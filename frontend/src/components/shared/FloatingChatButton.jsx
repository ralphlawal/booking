import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Only show on public pages — consumer pages already have Chat in their bottom nav
const SHOW_ON = ['/', '/book', '/booking-success', '/booking/lookup', '/admin/login', '/admin/register'];

export default function FloatingChatButton() {
  const { pathname } = useLocation();
  const show = SHOW_ON.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)));
  if (!show) return null;

  return (
    <a
      href="mailto:hello@bookam.business"
      title="Contact support"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl shadow-lg shadow-primary-600/25 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 text-sm font-semibold"
    >
      <MessageSquare className="w-5 h-5 flex-shrink-0" />
      <span className="hidden sm:inline">Need help?</span>
    </a>
  );
}
