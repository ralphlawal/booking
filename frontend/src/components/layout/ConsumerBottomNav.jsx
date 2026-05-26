import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Rss, Search, MessageSquare, User } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const NAV = [
  { to: '/customer/dashboard', icon: CalendarDays,  label: 'Bookings' },
  { to: '/feed',               icon: Rss,           label: 'Feed'     },
  { to: '/explore',            icon: Search,        label: 'Explore'  },
  { to: '/customer/messages',  icon: MessageSquare, label: 'Chat'     },
  { to: '/customer/profile',   icon: User,          label: 'Profile'  },
];

export default function ConsumerBottomNav() {
  const { unreadCount } = useNotifications();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex shadow-[0_-1px_0_0_rgb(0_0_0_/_0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] tap-highlight-none transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`relative px-3 py-1.5 rounded-2xl transition-all duration-200 ${
                isActive ? 'bg-primary-50 dark:bg-primary-900/40' : ''
              }`}>
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105' : ''}`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {label === 'Chat' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
