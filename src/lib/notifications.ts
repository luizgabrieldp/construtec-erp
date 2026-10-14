import { useErp } from '@/data/store';
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
    icon: origin ? `${origin}/icon-192-transparent.png` : '/icon-192-transparent.png',
    badge: origin ? `${origin}/favicon-32x32.png` : '/favicon-32x32.png',
  };
};

export const sendNotification = async (title: string, options?: NotificationOptions) => {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const { icon, badge } = getNotificationAssets();

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon,
          badge,
          ...options,
        });
        return;
      }
    }
  } catch {
    // fallback para API padrão
  }

  try {
    new Notification(title, {
      icon,
      badge,
      ...options,
    });
  } catch (e) {
    console.warn('Erro ao disparar notificação:', e);
  }
};

// Evita disparos duplicados para a mesma tarefa na mesma sessão
const tarefasNotificadas = new Set<string>();

export const verificarLembretesTarefas = () => {
  const data = useErp.getState().data;
  if (!data || !data.tarefas) return;

  const hoje = today();
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  data.tarefas.forEach((t) => {
    if (t.concluida) return;
    if (t.data !== hoje) return;
    if (tarefasNotificadas.has(t.id)) return;

    const horarioAlvo = t.diaInteiro ? '08:00' : (t.horario || '08:00');

    if (horaAtual >= horarioAlvo) {
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
