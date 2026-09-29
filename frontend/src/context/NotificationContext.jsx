import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { consumerAPI, consumerChatAPI } from '../services/api';
import { useCustomerAuth } from './CustomerAuthContext';
import { LOGO_BLUE_ICON } from '../config/logos';
import { apiBaseUrl } from '../config/platform';
import { navigateWithinApp, openExternalUrl } from '../services/nativeBridge';

const API = apiBaseUrl;

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return; // already subscribed

    const res = await fetch(`${API}/notifications/vapid-key`);
    if (!res.ok) return;
    const { vapidPublicKey } = await res.json();
    if (!vapidPublicKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    const token = localStorage.getItem('customerToken');
    if (!token) return;
    await fetch(`${API}/notifications/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {}
}

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
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );
  const intervalRef = useRef(null);
  const chatIntervalRef = useRef(null);
  const lastChatVisitRef = useRef(parseInt(localStorage.getItem('bam_chat_last_visit') || '0', 10));
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
        data: { url: notification.link || '/' },
      });
      n.onclick = () => {
        window.focus();
        if (notification.link && !navigateWithinApp(notification.link)) openExternalUrl(notification.link).catch(() => {});
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

  const fetchChatUnread = useCallback(() => {
    if (!localStorage.getItem('customerToken')) return;
    consumerChatAPI.getRooms()
      .then((rooms) => {
        const last = lastChatVisitRef.current;
        const unread = (rooms || []).filter(r =>
          r.last_message_at && new Date(r.last_message_at).getTime() > last
        ).length;
        setChatUnreadCount(unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!consumer) {
      setNotifications([]);
      setChatUnreadCount(0);
      knownIdsRef.current = new Set();
      hydratedRef.current = false;
      return;
    }
    fetch();
    fetchChatUnread();
    intervalRef.current = setInterval(fetch, 15000);
    chatIntervalRef.current = setInterval(fetchChatUnread, 10000);
    // If push permission already granted, silently subscribe (idempotent)
    if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
      subscribeToPush().catch(() => {});
    }
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(chatIntervalRef.current);
    };
  }, [consumer, fetch, fetchChatUnread]);

  const requestBrowserNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return 'unsupported';
    }
    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === 'granted') subscribeToPush().catch(() => {});
    return permission;
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (!unread.length) return;
    consumerAPI.markNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [notifications]);

  const markChatRead = useCallback(() => {
    const now = Date.now();
    lastChatVisitRef.current = now;
    localStorage.setItem('bam_chat_last_visit', String(now));
    setChatUnreadCount(0);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, chatUnreadCount, browserPermission, requestBrowserNotifications, markAllRead, markChatRead, refresh: fetch, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
