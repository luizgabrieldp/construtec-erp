import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useErp } from '@/data/store';
import { useAuth } from '@/data/auth';
import { toast } from '@/components/ui/Toast';
import { today } from '@/lib/dates';
import { ATUALIZACOES_SISTEMA } from '@/data/atualizacoes';

export const STORAGE_KEY_NOTIFICACOES_LIDAS = 'construtec:notificacoes:lidas:v1';
export const STORAGE_KEY_WEBPUSH_SUB = 'construtec:webpush:sub:v1';
export const VAPID_PUBLIC_KEY =
  'BF8LPrKxN_d4mvm15EDeeywp8eKTmF_iGky1ENIlQEZPdh9ropt15QQjNuC0y5Chw-i3kdULZrOgQ1mRPqxahts';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getStorageKeyNotificacoes(usuarioId?: string) {
  return usuarioId ? `construtec:notificacoes:lidas:${usuarioId}:v1` : STORAGE_KEY_NOTIFICACOES_LIDAS;
}

export function getNotificacoesLidas(usuarioId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getStorageKeyNotificacoes(usuarioId);
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveNotificacoesLidas(set: Set<string>, usuarioId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(set);
    const json = JSON.stringify(list);
    const key = getStorageKeyNotificacoes(usuarioId);
    localStorage.setItem(key, json);
    window.dispatchEvent(
      new CustomEvent('construtec:notificacoes:lidas', { detail: { usuarioId } }),
    );
  } catch {}
}

export function marcarNotificacoesComoLidas(idsParaMarcar: string[], usuarioId?: string): Set<string> {
  const lidas = getNotificacoesLidas(usuarioId);
  let alterou = false;
  idsParaMarcar.forEach((id) => {
    if (!lidas.has(id)) {
      lidas.add(id);
      alterou = true;
    }
  });
  if (alterou) {
    saveNotificacoesLidas(lidas, usuarioId);
  }
  return lidas;
}

export const isNotificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Registra e sincroniza a assinatura Web Push (VAPID) do aparelho atual no Service Worker e no Firestore
 * (Padrão G1 / MacMagazine para receber notificações mesmo com o navegador fechado)
 */
export async function sincronizarInscricaoWebPush(usuarioIdParam?: string): Promise<PushSubscriptionJSON | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.active) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2500)),
    ]);
    const activeReg = readyReg || reg;
    if (!activeReg || !('pushManager' in activeReg)) return null;

    let sub = await activeReg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return null;

    const usuarioAtual = useAuth.getState().usuarioAtual;
    const usuarioId = usuarioIdParam || usuarioAtual?.id || 'anon';

    try {
      localStorage.setItem(
        STORAGE_KEY_WEBPUSH_SUB,
        JSON.stringify({ usuarioId, subscription: subJson, updatedAt: Date.now() }),
      );
    } catch {}

    // Sincronizar inscrição no Firestore para disparos serverless com navegador fechado
    try {
      const pushDocRef = doc(db, 'construtec_erp', 'push_subscriptions');
      const snap = await getDoc(pushDocRef);
      let lista: Array<{
        endpoint: string;
        usuarioId: string;
        subscription: PushSubscriptionJSON;
        updatedAt: number;
      }> = [];
      if (snap.exists() && snap.data()?.payload) {
        const parsed = JSON.parse(snap.data().payload);
        if (Array.isArray(parsed.subscriptions)) {
          lista = parsed.subscriptions;
        }
      }
      const filtrada = lista.filter((item) => item.endpoint !== subJson.endpoint);
      filtrada.push({
        endpoint: subJson.endpoint,
        usuarioId,
        subscription: subJson,
        updatedAt: Date.now(),
      });
      // Mantém até as 50 inscrições mais recentes
      const compactada = filtrada.slice(-50);
      await setDoc(pushDocRef, {
        payload: JSON.stringify({ subscriptions: compactada }),
        updatedAt: new Date().toISOString(),
      });
    } catch {}

    return subJson;
  } catch {
    return null;
  }
}

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      await sincronizarInscricaoWebPush();
      sincronizarEstadoComServiceWorker();
    }
    return res;
  } catch {
    return 'denied';
  }
};

/**
 * Monitora reativamente mudanças na permissão de notificações do navegador (Padrão G1)
 */
let monitorPermissaoIniciado = false;
export function iniciarMonitorPermissaoWebPush(usuarioIdParam?: string) {
  if (typeof window === 'undefined' || monitorPermissaoIniciado) return;
  monitorPermissaoIniciado = true;

  if (getNotificationPermission() === 'granted') {
    void sincronizarInscricaoWebPush(usuarioIdParam);
  }

  if ('permissions' in navigator && typeof navigator.permissions?.query === 'function') {
    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((permStatus) => {
        permStatus.onchange = () => {
          if (Notification.permission === 'granted') {
            void sincronizarInscricaoWebPush(usuarioIdParam);
            verificarLembretesTarefas();
          }
        };
      })
      .catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        void sincronizarInscricaoWebPush(usuarioIdParam);
      }
    });
  }
}

/**
 * Dispara um Web Push remoto via API serverless (/api/push) para acordar aparelhos com navegador fechado
 */
export async function dispararWebPushRemoto(params: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  destinatarioTipo?: 'eu' | 'todos' | 'usuario';
  destinatarioId?: string;
  criadoPorId?: string;
  subscription?: PushSubscriptionJSON | null;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  try {
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: params.subscription,
        destinatarioTipo: params.destinatarioTipo,
        destinatarioId: params.destinatarioId,
        criadoPorId: params.criadoPorId,
        notification: {
          title: params.title,
          body: params.body,
          tag: params.tag || 'construtec-push',
          data: { url: params.url || '/tarefas' },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const getNotificationAssets = () => {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  return {
    icon: origin ? `${origin}/apple-touch-icon-dark.png` : '/apple-touch-icon-dark.png',
    badge: origin ? `${origin}/favicon-32x32.png` : '/favicon-32x32.png',
  };
};

export const sendNotification = async (title: string, options?: NotificationOptions & { data?: { url?: string } }) => {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const { icon, badge } = getNotificationAssets();
  const notificationOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean; silent?: boolean | null } = {
    icon,
    badge,
    vibrate: [200, 100, 200],
    renotify: true,
    silent: false,
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      let reg: ServiceWorkerRegistration | undefined = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) {
        try {
          reg = await navigator.serviceWorker.register('/sw.js');
        } catch {}
        if (!reg?.active) {
          reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500)),
          ]);
        }
      }
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
  } catch (err) {
    console.warn('Falha ao disparar notificação via Service Worker:', err);
  }

  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
    };
  } catch (e) {
    console.warn('Erro ao disparar notificação via Notification API:', e);
  }
};

// Chave diária persistente evita re-disparo duplicado no mesmo dia mesmo após refresh/reabertura do PWA
const STORAGE_KEY_DISPAROS = 'construtec:notificacoes:disparadas:v1';

function getDisparosDoDia(hoje: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPAROS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { data?: string; chaves?: string[] };
    if (parsed.data !== hoje || !Array.isArray(parsed.chaves)) {
      localStorage.setItem(STORAGE_KEY_DISPAROS, JSON.stringify({ data: hoje, chaves: [] }));
      return new Set();
    }
    return new Set(parsed.chaves);
  } catch {
    return new Set();
  }
}

function saveDisparosDoDia(hoje: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY_DISPAROS,
      JSON.stringify({ data: hoje, chaves: Array.from(set) }),
    );
  } catch {}
}

/**
 * Valida se uma tarefa é relevante para ser notificada ou exibida para o usuário logado
 * (se foi atribuída a ele, a todos ou criada por ele)
 */
export function isTarefaRelevanteParaUsuario(
  t: {
    destinatarioTipo?: 'eu' | 'todos' | 'usuario';
    destinatarioId?: string;
    criadoPorId?: string;
  },
  usuarioAtual?: { id: string } | null,
): boolean {
  if (!usuarioAtual) return true;
  const isParaTodos = !t.destinatarioTipo || t.destinatarioTipo === 'todos';
  const isParaMim =
    t.destinatarioTipo === 'eu' &&
    (!t.destinatarioId || t.destinatarioId === usuarioAtual.id || t.criadoPorId === usuarioAtual.id);
  const isAtribuidaAEle = t.destinatarioId === usuarioAtual.id;
  const isCriadaPorEle = t.criadoPorId === usuarioAtual.id;

  return isParaTodos || isParaMim || isAtribuidaAEle || isCriadaPorEle;
}

export interface TarefaNotificavel {
  id: string;
  titulo: string;
  observacoes?: string;
  data: string;
  horario?: string;
  diaInteiro?: boolean;
  concluida: boolean;
  destinatarioTipo?: 'eu' | 'todos' | 'usuario';
  destinatarioId?: string;
  criadoPorId?: string;
}

export interface AlertaAgendadoDisparo {
  title: string;
  body: string;
  tag: string;
  url: string;
  toastMsg: string;
  toastType: 'info' | 'success';
  chavesDisparo: string[];
}

/**
 * Avalia de forma pura quais notificações devem ser disparadas no minuto atual:
 * 1. Segunda a Sexta (diaSemana 1..5) a partir de 07:30:
 *    - Resumo Matinal Único: Lembrete de apontar presença dos funcionários + tarefas atrasadas (t.data < hoje) + tarefas do dia inteiro.
 * 2. Sábado e Domingo (diaSemana 0 ou 6):
 *    - Sem resumo matinal de presença; dispara apenas tarefas programadas para o fim de semana (t.data === hoje).
 * 3. Todos os dias:
 *    - Tarefas com horário específico (!t.diaInteiro && t.horario) disparam exatamente quando horaAtual >= t.horario.
 */
export function avaliarNotificacoesPendentesAgora(params: {
  tarefas: TarefaNotificavel[];
  usuarioAtual?: { id: string } | null;
  hoje: string;
  horaAtual: string;
  diaSemana: number;
  disparosHoje: Set<string>;
}): AlertaAgendadoDisparo[] {
  const { tarefas, usuarioAtual, hoje, horaAtual, diaSemana, disparosHoje } = params;
  const userKey = usuarioAtual ? usuarioAtual.id : 'anon';
  const isDiaUtil = diaSemana >= 1 && diaSemana <= 5;
  const alertas: AlertaAgendadoDisparo[] = [];

  const relevantes = tarefas.filter(
    (t) => !t.concluida && t.data <= hoje && isTarefaRelevanteParaUsuario(t, usuarioAtual),
  );
  const atrasadas = relevantes.filter((t) => t.data < hoje);
  const hojeDiaInteiro = relevantes.filter((t) => t.data === hoje && (t.diaInteiro || !t.horario));
  const hojeComHorario = relevantes.filter((t) => t.data === hoje && !t.diaInteiro && !!t.horario);

  const resumoKey = `${hoje}:${userKey}:resumo-matinal`;

  // 1. Segunda a Sexta às 07:30: Resumo Matinal Único (Presença da Equipe + Atrasadas + Dia Inteiro)
  if (isDiaUtil && horaAtual >= '07:30') {
    if (!disparosHoje.has(resumoKey)) {
      const chaves = [
        resumoKey,
        ...atrasadas.map((t) => `${hoje}:${userKey}:${t.id}`),
        ...hojeDiaInteiro.map((t) => `${hoje}:${userKey}:${t.id}`),
      ];

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

      alertas.push({
        title: 'Bom dia! Resumo Matinal CONSTRUTEC',
        body: partes.join(' '),
        tag: `resumo-matinal-${hoje}`,
        url: '/equipe',
        toastMsg:
          atrasadas.length > 0
            ? `Resumo Matinal: registre a presença da equipe (${atrasadas.length} tarefa(s) em atraso)`
            : 'Resumo Matinal: lembre-se de registrar a presença da equipe hoje',
        toastType: 'info',
        chavesDisparo: chaves,
      });
    } else {
      // Caso o resumo matinal das 07:30 já tenha ocorrido e uma nova tarefa sem horário seja cadastrada depois
      for (const t of [...atrasadas, ...hojeDiaInteiro]) {
        const tKey = `${hoje}:${userKey}:${t.id}`;
        if (!disparosHoje.has(tKey)) {
          const isAtrasada = t.data < hoje;
          alertas.push({
            title: `${isAtrasada ? 'Tarefa Atrasada CONSTRUTEC' : 'Lembrete CONSTRUTEC'}: ${t.titulo}`,
            body: t.observacoes ? `${t.titulo} - ${t.observacoes}` : t.titulo,
            tag: `tarefa-${t.id}`,
            url: '/tarefas',
            toastMsg: `${isAtrasada ? 'Tarefa em atraso' : 'Lembrete de Tarefa'}: ${t.titulo}`,
            toastType: isAtrasada ? 'info' : 'success',
            chavesDisparo: [tKey],
          });
        }
      }
    }
  }

  // 2. Sábado e Domingo: Sem resumo matinal de presença; dispara apenas tarefas programadas para o fim de semana
  if (!isDiaUtil && horaAtual >= '07:30') {
    for (const t of hojeDiaInteiro) {
      const tKey = `${hoje}:${userKey}:${t.id}`;
      if (!disparosHoje.has(tKey)) {
        alertas.push({
          title: `Lembrete CONSTRUTEC: ${t.titulo}`,
          body: t.observacoes ? `${t.titulo} - ${t.observacoes}` : t.titulo,
          tag: `tarefa-${t.id}`,
          url: '/tarefas',
          toastMsg: `Lembrete de Tarefa: ${t.titulo}`,
          toastType: 'success',
          chavesDisparo: [tKey],
        });
      }
    }
  }

  // 3. Qualquer dia da semana: Tarefas com horário específico (HH:mm) disparam no horário marcado
  for (const t of hojeComHorario) {
    const tKey = `${hoje}:${userKey}:${t.id}`;
    if (t.horario && horaAtual >= t.horario && !disparosHoje.has(tKey)) {
      alertas.push({
        title: `Lembrete (${t.horario}): ${t.titulo}`,
        body: t.observacoes ? `${t.titulo} - ${t.observacoes}` : t.titulo,
        tag: `tarefa-${t.id}`,
        url: '/tarefas',
        toastMsg: `Lembrete (${t.horario}): ${t.titulo}`,
        toastType: 'success',
        chavesDisparo: [tKey],
      });
    }
  }

  return alertas;
}

/**
 * Sincroniza o estado das tarefas e disparos do dia com o Service Worker para execução autônoma em segundo plano
 */
export function sincronizarEstadoComServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const data = useErp.getState().data;
    const usuarioAtual = useAuth.getState().usuarioAtual;
    const hoje = today();
    const disparosHoje = Array.from(getDisparosDoDia(hoje));

    navigator.serviceWorker.ready
      .then((reg) => {
        const worker = reg.active || navigator.serviceWorker.controller;
        if (!worker) return;
        worker.postMessage({
          type: 'SYNC_STATE_TO_SW',
          usuarioId: usuarioAtual?.id || null,
          tarefas: data?.tarefas || [],
          disparos: disparosHoje,
          hoje,
        });
      })
      .catch(() => {});
  } catch {}
}

let timersExatosIds: Array<ReturnType<typeof setTimeout>> = [];

function limparTimersExatos() {
  timersExatosIds.forEach((id) => clearTimeout(id));
  timersExatosIds = [];
}

function calcularMsAteHorarioHoje(horarioHHMM: string): number {
  const [hh, mm] = horarioHHMM.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return -1;
  const agora = new Date();
  const alvo = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    hh,
    mm,
    0,
    0,
  );
  return alvo.getTime() - agora.getTime();
}

/**
 * Agenda gatilhos exatos (ao segundo :00 do minuto HH:mm) para o resumo das 07:30 e para tarefas com horário específico
 */
export function agendarTimersExatosDoDia() {
  if (typeof window === 'undefined') return;
  limparTimersExatos();

  const data = useErp.getState().data;
  if (!data?.tarefas) return;
  const usuarioAtual = useAuth.getState().usuarioAtual;
  const hoje = today();
  const agora = new Date();
  const diaSemana = agora.getDay();
  const isDiaUtil = diaSemana >= 1 && diaSemana <= 5;
  const disparosHoje = getDisparosDoDia(hoje);
  const userKey = usuarioAtual ? usuarioAtual.id : 'anon';

  // 1. Timer exato para 07:30 (Resumo Matinal de Seg-Sex)
  if (isDiaUtil && !disparosHoje.has(`${hoje}:${userKey}:resumo-matinal`)) {
    const ms0730 = calcularMsAteHorarioHoje('07:30');
    if (ms0730 > 0 && ms0730 <= 12 * 3600 * 1000) {
      const id = setTimeout(() => verificarLembretesTarefas(), ms0730 + 250);
      timersExatosIds.push(id);
    }
  }

  // 2. Timers exatos para cada tarefa de hoje com horário específico (HH:mm)
  for (const t of data.tarefas) {
    if (t.concluida || t.data !== hoje || t.diaInteiro || !t.horario) continue;
    if (!isTarefaRelevanteParaUsuario(t, usuarioAtual)) continue;
    const tKey = `${hoje}:${userKey}:${t.id}`;
    if (disparosHoje.has(tKey)) continue;

    const msAlvo = calcularMsAteHorarioHoje(t.horario);
    if (msAlvo > 0 && msAlvo <= 12 * 3600 * 1000) {
      const id = setTimeout(() => verificarLembretesTarefas(), msAlvo + 250);
      timersExatosIds.push(id);

      // Também agenda no Service Worker caso a aba seja colocada em segundo plano/fechada próxima do horário
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready
          .then((reg) => {
            const worker = reg.active || navigator.serviceWorker.controller;
            if (worker && msAlvo <= 2 * 3600 * 1000) {
              worker.postMessage({
                type: 'SCHEDULE_NOTIFICATION',
                title: `Lembrete (${t.horario}): ${t.titulo}`,
                delay: msAlvo,
                options: {
                  body: t.observacoes ? `${t.titulo} - ${t.observacoes}` : t.titulo,
                  tag: `tarefa-${t.id}`,
                  data: { url: '/tarefas' },
                },
              });
            }
          })
          .catch(() => {});
      }
    }
  }
}

export const verificarLembretesTarefas = () => {
  const data = useErp.getState().data;
  if (!data || !data.tarefas) return;

  const usuarioAtual = useAuth.getState().usuarioAtual;

  const hoje = today();
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const diaSemana = agora.getDay();

  const disparosHoje = getDisparosDoDia(hoje);
  const alertas = avaliarNotificacoesPendentesAgora({
    tarefas: data.tarefas,
    usuarioAtual,
    hoje,
    horaAtual,
    diaSemana,
    disparosHoje,
  });

  if (alertas.length > 0) {
    for (const alerta of alertas) {
      alerta.chavesDisparo.forEach((k) => disparosHoje.add(k));
      void sendNotification(alerta.title, {
        body: alerta.body,
        tag: alerta.tag,
        data: { url: alerta.url },
      });
      toast(alerta.toastMsg, alerta.toastType);
    }
    saveDisparosDoDia(hoje, disparosHoje);
  }

  sincronizarEstadoComServiceWorker();
};

/**
 * Verifica se há uma nova versão do sistema ainda não notificada para o usuário atual
 * e dispara notificação push e toast informativo automaticamente
 */
export const verificarNotificacaoNovaVersao = (usuarioIdParam?: string) => {
  if (typeof window === 'undefined') return;
  const versaoRecente = ATUALIZACOES_SISTEMA[0];
  if (!versaoRecente) return;

  const usuarioAtual = useAuth.getState().usuarioAtual;
  const usuarioId = usuarioIdParam || usuarioAtual?.id;
  const userKey = usuarioId || 'anon';
  const storageKey = `construtec:notificacoes:versao_notificada:${userKey}`;

  const versaoNotificada = localStorage.getItem(storageKey);
  if (versaoNotificada !== versaoRecente.versao) {
    localStorage.setItem(storageKey, versaoRecente.versao);

    void sendNotification(`Atualização CONSTRUTEC ${versaoRecente.versao}`, {
      body: `${versaoRecente.titulo} - Toque para conferir as novidades.`,
      tag: `versao-${versaoRecente.versao}`,
      data: { url: '/configuracoes?aba=atualizacoes' },
    });

    toast(`Nova versão ${versaoRecente.versao} disponível: ${versaoRecente.titulo}`, 'info');
  }
};

/**
 * Inicia o verificador em background, sincronização Web Push VAPID (padrão G1) e gatilhos de horário exato
 */
export const iniciarVerificadorTarefas = (intervaloMs = 30000, usuarioIdParam?: string) => {
  iniciarMonitorPermissaoWebPush(usuarioIdParam);
  verificarLembretesTarefas();
  agendarTimersExatosDoDia();
  verificarNotificacaoNovaVersao(usuarioIdParam);
  void registrarBackgroundSync();

  const timer = setInterval(() => {
    verificarLembretesTarefas();
    agendarTimersExatosDoDia();
    verificarNotificacaoNovaVersao(usuarioIdParam);
  }, intervaloMs);

  return () => {
    clearInterval(timer);
    limparTimersExatos();
  };
};

/**
 * Registra sincronização periódica em background se suportada pelo PWA instalado
 */
export async function registrarBackgroundSync() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      const periodicSync = (reg as unknown as { periodicSync: { register: (tag: string, opt: { minInterval: number }) => Promise<void> } }).periodicSync;
      await periodicSync.register('construtec-tarefas-sync', {
        minInterval: 15 * 60 * 1000,
      });
    }
  } catch {}
}

/**
 * Dispara um teste agendado de notificação em segundo plano (Service Worker + Web Push VAPID real)
 */
export const testarNotificacaoSegundoPlano = async (delayMs = 3000) => {
  if (!isNotificationSupported()) {
    toast('Notificações não são suportadas neste navegador.', 'error');
    return;
  }
  if (Notification.permission !== 'granted') {
    const p = await requestNotificationPermission();
    if (p !== 'granted') {
      toast('Permissão de notificações recusada.', 'error');
      return;
    }
  }

  const sub = await sincronizarInscricaoWebPush();

  toast(
    `Aviso agendado para daqui a ${Math.round(delayMs / 1000)}s! Você pode minimizar ou fechar a janela para testar.`,
    'info',
  );

  let agendouNoSW = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const targetWorker = reg.active || navigator.serviceWorker.controller;
      if (targetWorker) {
        targetWorker.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          title: 'CONSTRUTEC ERP • Teste em Segundo Plano',
          delay: delayMs,
          options: {
            body: 'Notificação Web Push ativa! Seus alertas de 07:30 (Seg-Sex) e tarefas com horário funcionarão mesmo em segundo plano.',
            tag: `teste-bg-${Date.now()}`,
            data: { url: '/tarefas' },
          },
        });
        agendouNoSW = true;
      }
    } catch {}
  }

  setTimeout(() => {
    if (sub) {
      void dispararWebPushRemoto({
        subscription: sub,
        title: 'CONSTRUTEC ERP • Web Push Ativo',
        body: 'Conexão Web Push validada com sucesso neste aparelho.',
        tag: `teste-webpush-${Date.now()}`,
        url: '/configuracoes?aba=notificacoes',
      });
    }
    if (!agendouNoSW) {
      void sendNotification('CONSTRUTEC ERP • Teste em Segundo Plano', {
        body: 'Suas notificações de tarefas e atualizações estão funcionando perfeitamente.',
        tag: `teste-bg-${Date.now()}`,
      });
    }
  }, delayMs);
};
