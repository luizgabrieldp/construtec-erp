// CONSTRUTEC ERP - Service Worker v5 (Notificações Nativas em Segundo Plano & PWA)
const CACHE_NAME = 'construtec-pwa-v5';
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

// Listener para push notifications nativas (Web Push & Alertas em Segundo Plano)
self.addEventListener('push', (event) => {
  let title = 'CONSTRUTEC ERP';
  let options = {
    body: 'Você tem novas atualizações e lembretes da obra.',
    icon: '/apple-touch-icon-dark.png',
    badge: '/favicon-32x32.png',
    tag: 'construtec-alerta-geral',
    vibrate: [200, 100, 200],
    renotify: true,
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {
        ...options,
        body: data.body || options.body,
        tag: data.tag || options.tag,
        icon: data.icon || options.icon,
        badge: data.badge || options.badge,
        vibrate: data.vibrate || [200, 100, 200],
        renotify: data.renotify !== undefined ? data.renotify : true,
        data: data.data || {},
      };
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Suporte a Mensagens Diretas entre App e Service Worker (ex: disparo em background/teste)
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SHOW_NOTIFICATION' || event.data.type === 'TEST_NOTIFICATION')) {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'CONSTRUTEC ERP', {
        icon: '/apple-touch-icon-dark.png',
        badge: '/favicon-32x32.png',
        tag: options?.tag || 'construtec-aviso',
        vibrate: [200, 100, 200],
        renotify: true,
        ...options,
      })
    );
  }
});

// Suporte a Periodic Background Sync (quando suportado por PWA instalado no Android/Desktop/iOS)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'construtec-tarefas-sync' || event.tag === 'verificar-tarefas') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// Suporte a Background Sync tradicional
self.addEventListener('sync', (event) => {
  if (event.tag === 'construtec-sync-tarefas') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// Listener para cliques em notificações disparadas pelo sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
