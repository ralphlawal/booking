import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { LOGO_BLUE_ICON } from '../../config/logos';
import { getCookieConsent } from '../../utils/cookieConsent';

const keyFor = (role, id) => `bookam_notify_prompt_${role}_${id || 'anon'}`;

export default function BrowserNotificationPrompt() {
  const { user, business } = useAuth();
  const { consumer }       = useCustomerAuth();
  const { requestBrowserNotifications } = useNotifications();
  const [visible, setVisible] = useState(false);

  const account = consumer
    ? {
        role: 'customer', id: consumer.id,
        title: 'Customer notifications',
        body: 'Get booking updates, chat replies, payment alerts, and support messages.',
        sampleTitle: 'BookAm customer alerts are on',
        sampleBody: 'We will notify you about bookings, messages, payments, and support.',
      }
    : user
    ? {
        role: 'business', id: user.id,
        title: 'Business notifications',
        body: 'Get alerts for new bookings, customer messages, disputes, and admin updates.',
        sampleTitle: 'BookAm business alerts are on',
        sampleBody: business?.name
          ? `We will notify you about ${business.name} bookings and messages.`
          : 'We will notify you about bookings, messages, and account updates.',
      }
    : null;

  useEffect(() => {
    if (!account || typeof window === 'undefined' || !('Notification' in window)) {
      setVisible(false); return;
    }
    if (window.Notification.permission !== 'default') { setVisible(false); return; }
    const check = () => {
      if (!getCookieConsent()) { setVisible(false); return; }
      try {
        setVisible(localStorage.getItem(keyFor(account.role, account.id)) !== 'dismissed');
      } catch { setVisible(true); }
    };
    check();
    window.addEventListener('bookam:cookie-consent', check);
    return () => window.removeEventListener('bookam:cookie-consent', check);
  }, [account?.role, account?.id]);

  if (!account || !visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(keyFor(account.role, account.id), 'dismissed'); } catch {}
    setVisible(false);
  };

  const enable = async () => {
    if (!('Notification' in window)) return dismiss();
    if (consumer) {
      // For consumers: use the context method which handles permission + web push subscription
      const permission = await requestBrowserNotifications();
      if (permission === 'granted') {
        try {
          new window.Notification(account.sampleTitle, {
            body: account.sampleBody,
            icon: LOGO_BLUE_ICON,
            badge: LOGO_BLUE_ICON,
            tag: `bookam-${account.role}-enabled`,
          });
        } catch {}
      }
    } else {
      // For business users: just request permission (native push handles delivery)
      await window.Notification.requestPermission?.();
    }
    dismiss();
  };

  return (
    <div className="fixed left-3 right-3 bottom-[calc(var(--consumer-nav-height)+0.75rem)] z-[70] sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm">
      <div
        className="rounded-xl shadow-2xl p-4"
        style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>{account.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>{account.body}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={enable}  className="btn-primary  px-3 py-2 text-xs">Enable</button>
              <button type="button" onClick={dismiss} className="btn-secondary px-3 py-2 text-xs">Later</button>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
