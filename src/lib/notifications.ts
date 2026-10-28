import { useErp } from '@/data/store';
import { useAuth } from '@/data/auth';
import { toast } from '@/components/ui/Toast';
import { today } from '@/lib/dates';
import { ATUALIZACOES_SISTEMA } from '@/data/atualizacoes';

export const STORAGE_KEY_NOTIFICACOES_LIDAS = 'construtec:notificacoes:lidas:v1';

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
      new CustomEvent('construtec:notificacoes:lidas', { detail: { usuarioId } })
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

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return 'denied';
  }
};

const getNotificationAssets = () => {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  return {
    icon: origin ? `${origin}/apple-touch-icon-dark.png` : '/apple-touch-icon-dark.png',
    badge: origin ? `${origin}/favicon-32x32.png` : '/favicon-32x32.png',
  };
};

export const sendNotification = async (title: string, options?: NotificationOptions) => {
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

// Evita disparos duplicados para a mesma tarefa na mesma sessão
const tarefasNotificadas = new Set<string>();

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

export const verificarLembretesTarefas = () => {
  const data = useErp.getState().data;
  if (!data || !data.tarefas) return;

  const usuarioAtual = useAuth.getState().usuarioAtual;

  const hoje = today();
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const userKey = usuarioAtual ? usuarioAtual.id : 'anon';

  data.tarefas.forEach((t) => {
    if (t.concluida) return;
    if (t.data !== hoje) return;

    const notifKey = `${userKey}:${t.id}`;
    if (tarefasNotificadas.has(notifKey)) return;

    // Filtrar se a tarefa é relevante para o usuário conectado no momento
    // (se foi atribuída a ele, a todos ou criada por ele)
    if (!isTarefaRelevanteParaUsuario(t, usuarioAtual)) return;

    const horarioAlvo = t.diaInteiro ? '08:00' : (t.horario || '08:00');

    if (horaAtual >= horarioAlvo) {
      tarefasNotificadas.add(notifKey);
      tarefasNotificadas.add(t.id);
      const mensagem = t.observacoes ? `${t.titulo} - ${t.observacoes}` : t.titulo;

      sendNotification(`Lembrete CONSTRUTEC: ${t.titulo}`, {
        body: mensagem,
        tag: `tarefa-${t.id}`,
      });

      toast(`Lembrete de Tarefa: ${t.titulo}`, 'success');
    }
  });
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

    sendNotification(`Atualização CONSTRUTEC ${versaoRecente.versao}`, {
      body: `${versaoRecente.titulo} - Toque para conferir as novidades.`,
      tag: `versao-${versaoRecente.versao}`,
    });

    toast(`Nova versão ${versaoRecente.versao} disponível: ${versaoRecente.titulo}`, 'info');
  }
};

/**
 * Inicia o verificador em background a cada 60 segundos
 */
export const iniciarVerificadorTarefas = (intervaloMs = 60000, usuarioIdParam?: string) => {
  verificarLembretesTarefas();
  verificarNotificacaoNovaVersao(usuarioIdParam);
  registrarBackgroundSync();
  const timer = setInterval(() => {
    verificarLembretesTarefas();
    verificarNotificacaoNovaVersao(usuarioIdParam);
  }, intervaloMs);
  return () => clearInterval(timer);
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
        minInterval: 15 * 60 * 1000, // 15 minutos
      });
    }
  } catch {}
}

/**
 * Dispara um teste agendado de notificação em segundo plano
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

  toast(
    `Aviso agendado para daqui a ${Math.round(delayMs / 1000)}s! Bloqueie a tela ou coloque o app em segundo plano.`,
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
          title: 'CONSTRUTEC ERP • Notificação em Segundo Plano',
          options: {
            body: 'Alerta recebido com sucesso com o app em segundo plano! O sistema está pronto para emitir avisos de tarefas e obras.',
            tag: 'teste-segundo-plano',
            vibrate: [200, 100, 200],
            renotify: true,
            silent: false,
          },
          delay: delayMs,
        });
        agendouNoSW = true;
      }
    } catch {}
  }

  // Fallback caso Service Worker não esteja disponível no momento
  if (!agendouNoSW) {
    setTimeout(() => {
      sendNotification('CONSTRUTEC ERP • Notificação em Segundo Plano', {
        body: 'Alerta recebido com sucesso com o app em segundo plano! O sistema está pronto para emitir avisos de tarefas e obras.',
        tag: 'teste-segundo-plano',
        silent: false,
      });
    }, delayMs);
  }
};

