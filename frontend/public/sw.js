self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'BookAm', body: event.data.text() }; }

  const icon  = data.icon  || '/icons/icon-192.png';
  const badge = data.badge || '/icons/icon-96.png';
  const vibrate = data.vibrate || [200, 100, 200];

  event.waitUntil(
    self.registration.showNotification(data.title || 'BookAm', {
      body:    data.body  || '',
      icon,
      badge,
      vibrate,
      data:    { url: data.url || '/' },
      tag:     data.tag   || 'bookam-notification',
      renotify: true,
      requireInteraction: !!data.requireInteraction,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const origin = self.location.origin;
    const target = new URL(targetUrl, origin).href;
    for (const client of allClients) {
      if (client.url.startsWith(origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) client.navigate(target).catch(() => {});
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
