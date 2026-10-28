import { useErp } from '@/data/store';
import { useAuth } from '@/data/auth';
import { toast } from '@/components/ui/Toast';
import { today } from '@/lib/dates';

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
  const notificationOptions: NotificationOptions = {
    icon,
    badge,
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
    new Notification(title, notificationOptions);
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
 * Inicia o verificador em background a cada 60 segundos
 */
export const iniciarVerificadorTarefas = (intervaloMs = 60000) => {
  verificarLembretesTarefas();
  const timer = setInterval(verificarLembretesTarefas, intervaloMs);
  return () => clearInterval(timer);
};
