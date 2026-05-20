import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { consumerAPI } from '../services/api';
import { useCustomerAuth } from './CustomerAuthContext';

const NotificationContext = createContext({ notifications: [], unreadCount: 0, markAllRead: () => {}, refresh: () => {} });

export function NotificationProvider({ children }) {
  const { consumer } = useCustomerAuth();
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetch = useCallback(() => {
    if (!localStorage.getItem('customerToken')) return;
    consumerAPI.getNotifications()
      .then(setNotifications)
      .catch((err) => {
        if (err?.status === 401) setNotifications([]);
      });
  }, []);

  useEffect(() => {
    if (!consumer) { setNotifications([]); return; }
    fetch();
    intervalRef.current = setInterval(fetch, 8000);
    return () => clearInterval(intervalRef.current);
  }, [consumer, fetch]);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;
    consumerAPI.markNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, refresh: fetch, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
