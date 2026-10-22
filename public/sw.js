// CONSTRUTEC ERP - Service Worker v4
const CACHE_NAME = 'construtec-pwa-v4';
const STATIC_ASSETS = [
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icon-192.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/apple-touch-icon-dark.png',
  '/apple-touch-icon-light.png',
  '/logo-emblema-trim.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Listener para push notifications nativas
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      event.waitUntil(
        self.registration.showNotification(data.title || 'CONSTRUTEC ERP', {
          body: data.body || '',
          icon: '/apple-touch-icon-dark.png',
          badge: '/favicon-32x32.png',
          data: data.data || {},
        })
      );
    } catch {
      event.waitUntil(
        self.registration.showNotification('CONSTRUTEC ERP', {
          body: event.data.text(),
          icon: '/apple-touch-icon-dark.png',
          badge: '/favicon-32x32.png',
        })
      );
    }
  }
});

// Listener para cliques em notificações disparadas pelo sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
