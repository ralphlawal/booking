import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import toast from 'react-hot-toast';
import { navigateWithinApp, openExternalUrl } from './nativeBridge';

const isNative = Capacitor.isNativePlatform();
let listenersAttached = false;
let onRegisteredToken;
let onForegroundNotification;

export async function registerPushNotifications(onToken, onNotification) {
  if (!isNative) return; // browser push handled by service worker

  onRegisteredToken = onToken;
  onForegroundNotification = onNotification;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  if (!listenersAttached) {
    listenersAttached = true;
    PushNotifications.addListener('registration', (token) => {
      if (onRegisteredToken) onRegisteredToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // iOS displays background pushes itself. When BookAm is already open,
      // make the incoming notification equally visible inside the app.
      const title = notification.title || 'New notification';
      const body = notification.body ? `${title}: ${notification.body}` : title;
      toast(body, { id: `push-${notification.id || title}`, duration: 5000 });
      if (onForegroundNotification) onForegroundNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification?.data?.url;
      if (url && !navigateWithinApp(url)) openExternalUrl(url).catch(() => {});
    });
  }

  await PushNotifications.register();
}

export async function clearPushBadge() {
  if (!isNative) return;
  try { await PushNotifications.removeAllDeliveredNotifications(); } catch {}
}
