import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const isNative = Capacitor.isNativePlatform();

export async function registerPushNotifications(onToken, onNotification) {
  if (!isNative) return; // browser push handled by service worker

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    if (onToken) onToken(token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received foreground:', notification);
    if (onNotification) onNotification(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification?.data?.url;
    if (url) window.location.href = url;
  });
}

export async function clearPushBadge() {
  if (!isNative) return;
  try { await PushNotifications.removeAllDeliveredNotifications(); } catch {}
}
