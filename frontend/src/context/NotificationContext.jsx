import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { consumerAPI } from '../services/api';
import { useCustomerAuth } from './CustomerAuthContext';
import { LOGO_BLUE_ICON } from '../config/logos';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  browserPermission: 'unsupported',
  requestBrowserNotifications: async () => 'unsupported',
  markAllRead: () => {},
  refresh: () => {},
});

export function NotificationProvider({ children }) {
  const { consumer } = useCustomerAuth();
  const [notifications, setNotifications] = useState([]);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );
  const intervalRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const hydratedRef = useRef(false);

  const showBrowserNotification = useCallback((notification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return;
    try {
      const n = new window.Notification(notification.title || 'BookAm Business', {
        body: notification.body || 'You have a new notification.',
        icon: LOGO_BLUE_ICON,
        badge: LOGO_BLUE_ICON,
        tag: notification.id,
      });
      n.onclick = () => {
        window.focus();
        if (notification.link) window.location.href = notification.link;
      };
    } catch {}
  }, []);

  const fetch = useCallback(() => {
    if (!localStorage.getItem('customerToken')) return;
    consumerAPI.getNotifications()
      .then((items) => {
        const next = Array.isArray(items) ? items : [];
        const newUnread = next.filter(n => !n.is_read && !knownIdsRef.current.has(n.id));
        setNotifications(next);
        next.forEach(n => knownIdsRef.current.add(n.id));
        if (hydratedRef.current) newUnread.forEach(showBrowserNotification);
        hydratedRef.current = true;
      })
      .catch((err) => {
        if (err?.status === 401) setNotifications([]);
      });
  }, [showBrowserNotification]);

  useEffect(() => {
    if (!consumer) {
      setNotifications([]);
      knownIdsRef.current = new Set();
      hydratedRef.current = false;
      return;
    }
    fetch();
    intervalRef.current = setInterval(fetch, 5000);
    return () => clearInterval(intervalRef.current);
  }, [consumer, fetch]);

  const requestBrowserNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return 'unsupported';
    }
    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    return permission;
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;
    consumerAPI.markNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, browserPermission, requestBrowserNotifications, markAllRead, refresh: fetch, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
