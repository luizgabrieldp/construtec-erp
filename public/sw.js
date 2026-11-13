// CONSTRUTEC ERP - Service Worker v7 (Web Push VAPID, Resumo Matinal Seg-Sex 07:30, Horários Exatos & Cache Offline)
const CACHE_NAME = 'construtec-pwa-v7';
const STATE_CACHE_NAME = 'construtec-sw-state-v1';
const STATE_CACHE_URL = '/__sw_state_construtec.json';
const VAPID_PUBLIC_KEY =
  'BF8LPrKxN_d4mvm15EDeeywp8eKTmF_iGky1ENIlQEZPdh9ropt15QQjNuC0y5Chw-i3kdULZrOgQ1mRPqxahts';
const FIRESTORE_MAIN_STATE_URL =
  'https://firestore.googleapis.com/v1/projects/construtec-erp-2026/databases/(default)/documents/construtec_erp/main_state';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.svg',
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

const scheduledTimers = new Map();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function lerEstadoSW() {
  try {
    const cache = await caches.open(STATE_CACHE_NAME);
    const res = await cache.match(STATE_CACHE_URL);
    if (!res) return { usuarioId: null, tarefas: [], disparos: {} };
    return await res.json();
  } catch {
    return { usuarioId: null, tarefas: [], disparos: {} };
  }
}

async function salvarEstadoSW(novoEstado) {
  try {
    const cache = await caches.open(STATE_CACHE_NAME);
    await cache.put(
      STATE_CACHE_URL,
      new Response(JSON.stringify(novoEstado), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch {}
}

function isTarefaRelevanteSW(t, usuarioId) {
  if (!usuarioId) return true;
  const isParaTodos = !t.destinatarioTipo || t.destinatarioTipo === 'todos';
  const isParaMim =
    t.destinatarioTipo === 'eu' &&
    (!t.destinatarioId || t.destinatarioId === usuarioId || t.criadoPorId === usuarioId);
  const isAtribuidaAEle = t.destinatarioId === usuarioId;
  const isCriadaPorEle = t.criadoPorId === usuarioId;
  return isParaTodos || isParaMim || isAtribuidaAEle || isCriadaPorEle;
}

function obterAgoraLocal() {
  const agora = new Date();
  const yyyy = agora.getFullYear();
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const hh = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');
  return {
    hoje: `${yyyy}-${mm}-${dd}`,
    horaAtual: `${hh}:${min}`,
    diaSemana: agora.getDay(),
  };
}

async function buscarTarefasAtualizadas(estadoAtual) {
  try {
    const res = await fetch(FIRESTORE_MAIN_STATE_URL, { cache: 'no-store' });
    if (res.ok) {
      const doc = await res.json();
      const raw = doc?.fields?.payload?.stringValue;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.tarefas)) {
          return parsed.tarefas;
        }
      }
    }
  } catch {}
  return Array.isArray(estadoAtual.tarefas) ? estadoAtual.tarefas : [];
}

async function verificarEDispararNoSW() {
  const estado = await lerEstadoSW();
  const tarefas = await buscarTarefasAtualizadas(estado);
  const { hoje, horaAtual, diaSemana } = obterAgoraLocal();
  const isDiaUtil = diaSemana >= 1 && diaSemana <= 5;
  const userKey = estado.usuarioId || 'anon';
  const disparosHoje = Array.isArray(estado.disparos?.[hoje])
    ? new Set(estado.disparos[hoje])
    : new Set();

  let alterou = false;
  const relevantes = tarefas.filter(
    (t) => !t.concluida && t.data <= hoje && isTarefaRelevanteSW(t, estado.usuarioId),
  );
  const atrasadas = relevantes.filter((t) => t.data < hoje);
  const hojeDiaInteiro = relevantes.filter((t) => t.data === hoje && (t.diaInteiro || !t.horario));
  const hojeComHorario = relevantes.filter((t) => t.data === hoje && !t.diaInteiro && !!t.horario);

  // 1. Resumo Matinal: Segunda a Sexta às 07:30 (Presença + Atrasadas + Dia Inteiro)
  const resumoKey = `${hoje}:${userKey}:resumo-matinal`;
  if (isDiaUtil && horaAtual >= '07:30' && !disparosHoje.has(resumoKey)) {
    disparosHoje.add(resumoKey);
    atrasadas.forEach((t) => disparosHoje.add(`${hoje}:${userKey}:${t.id}`));
    hojeDiaInteiro.forEach((t) => disparosHoje.add(`${hoje}:${userKey}:${t.id}`));
    alterou = true;

    const partes = ['Lembre-se de registrar a presença dos funcionários de hoje.'];
    if (atrasadas.length > 0) {
      partes.push(
        `${atrasadas.length} tarefa(s) atrasada(s): ${atrasadas
          .slice(0, 2)
          .map((t) => t.titulo)
          .join(', ')}.`,
      );
    }
    if (hojeDiaInteiro.length > 0) {
      partes.push(
        `${hojeDiaInteiro.length} lembrete(s) para hoje: ${hojeDiaInteiro
          .slice(0, 2)
          .map((t) => t.titulo)
          .join(', ')}.`,
      );
    }

    await self.registration.showNotification('Bom dia! Resumo Matinal CONSTRUTEC', {
      body: partes.join(' '),
      icon: '/apple-touch-icon-dark.png',
      badge: '/favicon-32x32.png',
      tag: `resumo-matinal-${hoje}`,
      vibrate: [200, 100, 200],
      renotify: true,
      silent: false,
      data: { url: '/equipe' },
    });
  }

  // 2. Sábado e Domingo: Sem resumo matinal de presença, apenas lembretes programados para hoje
  if (!isDiaUtil && horaAtual >= '07:30') {
    for (const t of hojeDiaInteiro) {
      const tKey = `${hoje}:${userKey}:${t.id}`;
      if (!disparosHoje.has(tKey)) {
        disparosHoje.add(tKey);
        alterou = true;
        await self.registration.showNotification(`Lembrete CONSTRUTEC: ${t.titulo}`, {
          body: t.observacoes ? `${t.titulo} — ${t.observacoes}` : t.titulo,
          icon: '/apple-touch-icon-dark.png',
          badge: '/favicon-32x32.png',
          tag: `tarefa-${t.id}`,
          vibrate: [200, 100, 200],
          renotify: true,
          silent: false,
          data: { url: '/tarefas' },
        });
      }
    }
  }

  // 3. Tarefas com Horário Específico (HH:mm) em qualquer dia da semana
  for (const t of hojeComHorario) {
    const tKey = `${hoje}:${userKey}:${t.id}`;
    if (horaAtual >= t.horario && !disparosHoje.has(tKey)) {
      disparosHoje.add(tKey);
      alterou = true;
      await self.registration.showNotification(`Lembrete (${t.horario}): ${t.titulo}`, {
        body: t.observacoes ? `${t.titulo} — ${t.observacoes}` : t.titulo,
        icon: '/apple-touch-icon-dark.png',
        badge: '/favicon-32x32.png',
        tag: `tarefa-${t.id}`,
        vibrate: [200, 100, 200],
        renotify: true,
        silent: false,
        data: { url: '/tarefas' },
      });
    }
  }

  if (alterou) {
    await salvarEstadoSW({
      ...estado,
      tarefas,
      disparos: { [hoje]: Array.from(disparosHoje) },
    });
  }
}

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
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== STATE_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
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
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/api/')) return;

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

// Listener para push notifications nativas (Web Push W3C VAPID — funciona com navegador fechado igual G1 e MacMagazine)
self.addEventListener('push', (event) => {
  let title = 'CONSTRUTEC ERP';
  let options = {
    body: 'Você tem novas atualizações e lembretes da obra.',
    icon: '/apple-touch-icon-dark.png',
    badge: '/favicon-32x32.png',
    tag: 'construtec-alerta-geral',
    vibrate: [200, 100, 200],
    renotify: true,
    silent: false,
    data: { url: '/' },
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
        data: data.data || { url: data.url || '/' },
      };
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Renovação automática da assinatura Web Push (padrão OneSignal / MacMagazine)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      .then(async (newSub) => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSub.toJSON ? newSub.toJSON() : newSub,
          });
        }
      })
      .catch(() => {}),
  );
});

// Suporte a Mensagens Diretas entre App e Service Worker
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
    const timerKey = options?.tag || `${title}-${Date.now()}`;
    if (scheduledTimers.has(timerKey)) {
      clearTimeout(scheduledTimers.get(timerKey));
    }
    event.waitUntil(
      new Promise((resolve) => {
        const timerId = setTimeout(async () => {
          scheduledTimers.delete(timerKey);
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
        scheduledTimers.set(timerKey, timerId);
      }),
    );
  } else if (event.data.type === 'SYNC_STATE_TO_SW') {
    const { usuarioId, tarefas, disparos, hoje } = event.data;
    event.waitUntil(
      lerEstadoSW().then((atual) => {
        const mapaDisparos = { ...(atual.disparos || {}) };
        if (hoje && Array.isArray(disparos)) {
          const combinados = new Set([...(mapaDisparos[hoje] || []), ...disparos]);
          mapaDisparos[hoje] = Array.from(combinados);
        }
        return salvarEstadoSW({
          usuarioId: usuarioId !== undefined ? usuarioId : atual.usuarioId,
          tarefas: Array.isArray(tarefas) ? tarefas : atual.tarefas || [],
          disparos: mapaDisparos,
        });
      }),
    );
  }
});

// Suporte a Periodic Background Sync (avalia Resumo Matinal Seg-Sex 07:30 e Horários Exatos em background)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'construtec-tarefas-sync' || event.tag === 'verificar-tarefas') {
    event.waitUntil(verificarEDispararNoSW());
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
