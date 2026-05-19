import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Search, MessageSquare, User } from 'lucide-react';

const NAV = [
  { to: '/customer/dashboard', icon: CalendarDays,  label: 'Bookings' },
  { to: '/explore',            icon: Search,        label: 'Explore'  },
  { to: '/customer/messages',  icon: MessageSquare, label: 'Messages' },
  { to: '/customer/profile',   icon: User,          label: 'Profile'  },
];

export default function ConsumerBottomNav({ unreadCount = 0 }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors relative ${
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {label === 'Bookings' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
