import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Rss, Search, MessageSquare, User } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { nativeTapFeedback } from '../../services/nativeBridge';

const NAV = [
  { to: '/customer/dashboard', icon: CalendarDays,  label: 'Bookings', gradient: 'from-violet-500 to-primary-600'  },
  { to: '/feed',               icon: Rss,           label: 'Feed',     gradient: 'from-rose-500 to-pink-500'       },
  { to: '/explore',            icon: Search,        label: 'Explore',  gradient: 'from-sky-500 to-blue-600'        },
  { to: '/customer/messages',  icon: MessageSquare, label: 'Chat',     gradient: 'from-emerald-500 to-teal-500'    },
  { to: '/customer/profile',   icon: User,          label: 'Profile',  gradient: 'from-amber-500 to-orange-500'    },
];

function NavItem({ to, icon: Icon, label, unreadCount, gradient }) {
  return (
    <NavLink
      to={to}
      onClick={() => nativeTapFeedback()}
      className="flex-1 flex flex-col items-center justify-center py-1.5 gap-1 text-[10px] font-bold tap-highlight-none select-none min-h-[64px]"
    >
      {({ isActive }) => (
        <>
          <div
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out ${
              isActive ? `bg-gradient-to-br ${gradient}` : ''
            }`}
            style={{
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              boxShadow: isActive ? '0 4px 18px rgba(0,0,0,0.18)' : 'none',
            }}
          >
            <Icon
              className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-400'}`}
              strokeWidth={isActive ? 2.5 : 2}
            />
            {label === 'Chat' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className={`leading-none transition-all duration-200 ${isActive ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function ConsumerBottomNav() {
  const { chatUnreadCount } = useNotifications();

  return (
    <>
      {/* Mobile: frosted glass bottom bar */}
      <nav
        className="consumer-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderColor: 'var(--bam-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft:   'env(safe-area-inset-left, 0px)',
          paddingRight:  'env(safe-area-inset-right, 0px)',
          boxShadow: '0 -4px 24px rgba(91,63,234,0.07)',
        }}
      >
        <div className="max-w-md mx-auto px-1 flex">
          {NAV.map(({ to, icon, label, gradient }) => (
            <NavItem key={to} to={to} icon={icon} label={label} unreadCount={chatUnreadCount} gradient={gradient} />
          ))}
        </div>
      </nav>

      {/* Desktop: left sidebar */}
      <nav
        className="hidden lg:flex fixed left-0 top-14 bottom-0 w-16 z-40 flex-col items-center py-4 gap-0.5 backdrop-blur-xl border-r"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderColor: 'var(--bam-border)',
        }}
      >
        {NAV.map(({ to, icon: Icon, label, gradient }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center w-14 py-2.5 rounded-xl gap-1 text-[9px] font-bold transition-all tap-highlight-none"
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? `bg-gradient-to-br ${gradient}` : 'hover:bg-gray-100'
                  }`}
                  style={{
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`leading-none transition-colors duration-200 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
