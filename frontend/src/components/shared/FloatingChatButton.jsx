import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

// Global floating chat/support button — hidden on admin pages and the messages page itself
const HIDDEN_ON = ['/admin', '/customer/messages', '/admin-support'];

export default function FloatingChatButton() {
  const { pathname } = useLocation();
  if (HIDDEN_ON.some(p => pathname.startsWith(p))) return null;

  return (
    <Link
      to="/customer/messages"
      title="Chat with us"
      className="fixed bottom-6 right-5 z-50 group flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl shadow-lg shadow-primary-600/25 px-4 py-3 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
    >
      <MessageSquare className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-semibold whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 sm:max-w-xs">
        Chat with us
      </span>
    </Link>
  );
}
