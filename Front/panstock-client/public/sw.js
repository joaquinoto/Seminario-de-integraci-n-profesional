const CACHE_NAME  = 'panstock-v3';
const NOTIF_ICON  = '/logo_panstock.png';
const NOTIF_BADGE = '/logo_panstock.png';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() =>
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    )
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: 'PanStock', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'PanStock — Alerta de vencimiento';
  const options = {
    body:               data.body    || 'Hay productos próximos a vencer.',
    icon:               NOTIF_ICON,
    badge:              NOTIF_BADGE,
    tag:                data.tag     || 'panstock-expiration',
    renotify:           true,
    requireInteraction: false,
    data: { url: data.url || '/expiration', ...data },
    actions: [
      { action: 'view',    title: 'Ver vencimientos' },
      { action: 'dismiss', title: 'Cerrar'           },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url : '/expiration';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(fullUrl);
          else client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration
      .showNotification(title || 'PanStock', {
        body:               body    || '',
        icon:               NOTIF_ICON,
        badge:              NOTIF_BADGE,
        tag:                tag     || 'panstock-expiration',
        renotify:           true,
        requireInteraction: false,
        data:               { url: url || '/expiration' },
        actions: [
          { action: 'view',    title: 'Ver vencimientos' },
          { action: 'dismiss', title: 'Cerrar'           },
        ],
      })
      .catch((err) => console.warn('[PanStock SW] showNotification error:', err));
  }

  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
