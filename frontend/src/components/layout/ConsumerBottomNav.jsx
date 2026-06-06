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

function NavItem({ to, icon: Icon, label, unreadCount, vertical = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        vertical
          ? `flex flex-col items-center justify-center w-12 py-3 rounded-xl gap-1 text-[10px] font-semibold transition-all tap-highlight-none ${
              isActive ? 'bg-white/15 text-white' : 'text-primary-200/60 hover:text-white hover:bg-white/10'
            }`
          : `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-semibold transition-colors relative min-h-[66px] tap-highlight-none ${
              isActive ? 'text-white' : 'text-primary-100/80 hover:text-white'
            }`
      }
    >
      {({ isActive }) => (
        <>
          {!vertical && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary-400 rounded-full"
              style={{
                width: isActive ? '2rem' : '0rem',
                opacity: isActive ? 1 : 0,
                transition: 'width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
              }}
            />
          )}
          <div className={`relative grid place-items-center ${vertical ? 'w-7 h-7' : 'w-9 h-8'} rounded-lg transition-colors ${isActive && !vertical ? 'bg-white/15' : ''}`}>
            <Icon
              className="w-5 h-5"
              strokeWidth={isActive ? 2.5 : 2}
              style={{
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.3s ease',
              }}
            />
            {label === 'Chat' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="leading-none">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function ConsumerBottomNav() {
  const { unreadCount } = useNotifications();

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary-950 text-white border-t border-primary-800 shadow-[0_-10px_30px_rgba(30,19,86,0.36)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto px-2 flex min-h-[72px]">
          {NAV.map(({ to, icon, label }) => (
            <NavItem key={to} to={to} icon={icon} label={label} unreadCount={unreadCount} vertical={false} />
          ))}
        </div>
      </nav>

      {/* Desktop: fixed left sidebar (starts below the sticky top nav at top-14) */}
      <nav className="hidden lg:flex fixed left-0 top-14 bottom-0 w-16 z-40 flex-col items-center py-4 gap-1 bg-primary-950 text-white border-r border-primary-800">
        {NAV.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} unreadCount={unreadCount} vertical={true} />
        ))}
      </nav>
    </>
  );
}
