const CACHE_NAME  = 'panstock-v4';
const NOTIF_ICON  = '/logo_panstock.png';
const NOTIF_BADGE = '/logo_panstock.png';

/* ──────────────────────────────────────────────────────────────────────────
   INSTALL — skipWaiting DENTRO de waitUntil para que macOS no cancele el SW
   antes de que tome control.
   ────────────────────────────────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

/* ──────────────────────────────────────────────────────────────────────────
   ACTIVATE — clients.claim() + limpieza de caches viejos en waitUntil.
   En macOS, si activate termina antes de que termine clients.claim(),
   el SW puede quedar en estado "activating" y showNotification() falla.
   ────────────────────────────────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

/* ──────────────────────────────────────────────────────────────────────────
   PUSH — handler para push nativo (Web Push Protocol)
   macOS Safari 16.4+ soporta Push API; Chrome/Firefox igual.
   ────────────────────────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'PanStock', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'PanStock — Alerta de vencimiento';
  const options = {
    body:               data.body    || 'Hay productos próximos a vencer.',
    icon:               NOTIF_ICON,
    badge:              NOTIF_BADGE,
    tag:                data.tag     || 'panstock-expiration',
    renotify:           true,
    requireInteraction: false,
    data:               { url: data.url || '/expiration', ...data },
    actions: [
      { action: 'view',    title: 'Ver vencimientos' },
      { action: 'dismiss', title: 'Cerrar'           },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ──────────────────────────────────────────────────────────────────────────
   NOTIFICATIONCLICK
   ────────────────────────────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/expiration';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
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

/* ──────────────────────────────────────────────────────────────────────────
   MESSAGE — recibe SHOW_NOTIFICATION desde el cliente (polling-based).
   
   CRÍTICO para macOS: en macOS, new Notification() desde el hilo principal
   falla silenciosamente en muchos escenarios (tab en background, foco perdido,
   restricciones de DND). El SW showNotification() es la vía confiable.
   
   Este handler espera a que el SW esté activo antes de mostrar la notif
   usando event.waitUntil() para que macOS no mate el SW en medio.
   ──────────────────────────────────────────────────────────────────────── */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url, icon } = event.data;

    const notifPromise = self.registration.showNotification(
      title || 'PanStock',
      {
        body:               body    || '',
        icon:               icon    || NOTIF_ICON,
        badge:              NOTIF_BADGE,
        tag:                tag     || 'panstock-expiration',
        renotify:           true,
        requireInteraction: false,
        data:               { url: url || '/expiration' },
        actions: [
          { action: 'view',    title: 'Ver vencimientos' },
          { action: 'dismiss', title: 'Cerrar'           },
        ],
      }
    ).catch((err) => {
      console.warn('[PanStock SW] showNotification error:', err);
    });

    event.waitUntil(notifPromise);

    if (event.source && 'postMessage' in event.source) {
      event.source.postMessage({ type: 'NOTIFICATION_SENT', tag });
    }
  }

  if (event.data.type === 'PING') {
    if (event.source && 'postMessage' in event.source) {
      event.source.postMessage({ type: 'PONG' });
    }
  }

  if (event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});