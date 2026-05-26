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
      className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 pointer-events-none"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-md rounded-lg border border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-xl pointer-events-auto overflow-hidden">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 min-h-[52px] tap-highlight-none transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-primary-50 dark:bg-primary-900/40' : ''
                }`}>
                  <Icon
                    className={`w-[18px] h-[18px] transition-transform duration-150 ${isActive ? 'scale-105' : ''}`}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                  {label === 'Chat' && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-950" />
                  )}
                </div>
                <span className={`text-[9px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
