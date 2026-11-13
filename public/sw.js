// CONSTRUTEC ERP - Service Worker v6 (Notificações Nativas, Cache Offline & Segurança)
const CACHE_NAME = 'construtec-pwa-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icon-192.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/apple-touch-icon-dark.png',
  '/apple-touch-icon-light.png',
  '/logo-emblema-trim.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Estratégia Network-First para HTML/navegação com fallback offline seguro e Cache-First para assets locais estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const fallbackIndex = await caches.match('/index.html');
          if (fallbackIndex) return fallbackIndex;
          return new Response('Você está offline. Reconecte-se para atualizar o aplicativo.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      }),
    );
  }
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
        silent: data.silent !== undefined ? data.silent : false,
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
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION' || event.data.type === 'TEST_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'CONSTRUTEC ERP', {
        icon: '/apple-touch-icon-dark.png',
        badge: '/favicon-32x32.png',
        tag: options?.tag || 'construtec-aviso',
        vibrate: [200, 100, 200],
        renotify: true,
        silent: false,
        ...options,
      }),
    );
  } else if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delay = 3000 } = event.data;
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await self.registration.showNotification(title || 'CONSTRUTEC ERP', {
              icon: '/apple-touch-icon-dark.png',
              badge: '/favicon-32x32.png',
              tag: options?.tag || 'construtec-aviso',
              vibrate: [200, 100, 200],
              renotify: true,
              silent: false,
              ...options,
            });
          } catch (e) {
            console.error('Falha ao exibir notificação agendada no SW:', e);
          }
          resolve();
        }, delay);
      }),
    );
  }
});

// Suporte a Periodic Background Sync (quando suportado por PWA instalado)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'construtec-tarefas-sync' || event.tag === 'verificar-tarefas') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length === 0) {
          return self.registration.showNotification('CONSTRUTEC ERP • Lembrete Operacional', {
            body: 'Verifique suas tarefas e pendências agendadas para hoje na obra.',
            icon: '/apple-touch-icon-dark.png',
            badge: '/favicon-32x32.png',
            tag: 'construtec-tarefas-sync-lembrete',
            vibrate: [200, 100, 200],
            renotify: false,
            silent: false,
            data: { url: '/tarefas' },
          });
        }
      }),
    );
  }
});

function resolverUrlMesmaOrigem(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '/';
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
}

// Listener para cliques em notificações disparadas pelo sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = resolverUrlMesmaOrigem(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const clientPath = new URL(client.url).pathname;
            if (targetUrl && clientPath !== targetUrl && 'navigate' in client) {
              client.navigate(targetUrl);
            }
          } catch {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
