import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function FloatingChatButton() {
  const { consumer } = useCustomerAuth();

  const href = consumer ? '/customer/messages' : '/customer/login';

  return (
    <Link
      to={href}
      title="Chat with us"
      className="fixed bottom-6 right-5 z-50 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl shadow-lg shadow-primary-600/30 px-4 py-3 transition-all duration-200 hover:shadow-xl hover:scale-105"
    >
      <MessageSquare className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-semibold hidden sm:inline">Chat with us</span>
    </Link>
  );
}
