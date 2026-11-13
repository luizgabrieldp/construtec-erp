import { FIRESTORE_BASE_URL, sendWebPushNotification } from './_webpush.js';

function obterDataHoraBrasilia() {
  const agora = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(agora);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const hoje = `${map.year}-${map.month}-${map.day}`;
  const horaAtual = `${map.hour === '24' ? '00' : map.hour}:${map.minute}`;
  const mapSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const diaSemana = mapSemana[map.weekday] ?? agora.getDay();
  return { hoje, horaAtual, diaSemana };
}

function isTarefaRelevante(t, usuarioId) {
  if (!usuarioId) return true;
  const isParaTodos = !t.destinatarioTipo || t.destinatarioTipo === 'todos';
  const isParaMim =
    t.destinatarioTipo === 'eu' &&
    (!t.destinatarioId || t.destinatarioId === usuarioId || t.criadoPorId === usuarioId);
  const isAtribuidaAEle = t.destinatarioId === usuarioId;
  const isCriadaPorEle = t.criadoPorId === usuarioId;
  return isParaTodos || isParaMim || isAtribuidaAEle || isCriadaPorEle;
}

async function lerDocFirestore(docName) {
  const res = await fetch(`${FIRESTORE_BASE_URL}/construtec_erp/${docName}`);
  if (!res.ok) return null;
  const doc = await res.json();
  const raw = doc?.fields?.payload?.stringValue;
  if (!raw) return null;
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  try {
    const { hoje, horaAtual, diaSemana } = obterDataHoraBrasilia();
    const isDiaUtil = diaSemana >= 1 && diaSemana <= 5;

    const [mainState, subDoc] = await Promise.all([
      lerDocFirestore('main_state'),
      lerDocFirestore('push_subscriptions'),
    ]);

    const tarefas = Array.isArray(mainState?.tarefas) ? mainState.tarefas : [];
    const subscriptions = Array.isArray(subDoc?.subscriptions) ? subDoc.subscriptions : [];

    if (subscriptions.length === 0) {
      return res.status(200).json({ ok: true, hoje, horaAtual, enviados: 0, motivo: 'sem_inscricoes' });
    }

    let enviados = 0;

    for (const item of subscriptions) {
      if (!item?.subscription?.endpoint) continue;
      const usuarioId = item.usuarioId || null;

      const tarefasUsuario = tarefas.filter(
        (t) => !t.concluida && t.data <= hoje && isTarefaRelevante(t, usuarioId),
      );
      const atrasadas = tarefasUsuario.filter((t) => t.data < hoje);
      const hojeDiaInteiro = tarefasUsuario.filter(
        (t) => t.data === hoje && (t.diaInteiro || !t.horario),
      );
      const hojeComHorario = tarefasUsuario.filter(
        (t) => t.data === hoje && !t.diaInteiro && !!t.horario,
      );

      // 1. Segunda a Sexta: Resumo Matinal às 07:30 (Presença + Atrasadas + Dia Inteiro)
      if (isDiaUtil && horaAtual >= '07:30' && horaAtual <= '09:30') {
        const partes = ['Registre a presença dos funcionários na grade de hoje.'];
        if (atrasadas.length > 0) {
          partes.push(
            `${atrasadas.length} tarefa(s) em atraso: ${atrasadas
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

        const r = await sendWebPushNotification(item.subscription, {
          title: 'Bom dia! Resumo Matinal CONSTRUTEC',
          body: partes.join(' '),
          tag: `resumo-matinal-${hoje}`,
          renotify: false,
          data: { url: '/equipe' },
        });
        if (r.ok) enviados++;
      }

      // 2. Sábado e Domingo: Sem resumo matinal de presença, apenas tarefas programadas para o fim de semana
      if (!isDiaUtil && horaAtual >= '07:30' && horaAtual <= '09:30' && hojeDiaInteiro.length > 0) {
        for (const t of hojeDiaInteiro) {
          const r = await sendWebPushNotification(item.subscription, {
            title: `Lembrete CONSTRUTEC: ${t.titulo}`,
            body: t.observacoes ? `${t.titulo} — ${t.observacoes}` : t.titulo,
            tag: `tarefa-${t.id}-${hoje}`,
            renotify: false,
            data: { url: '/tarefas' },
          });
          if (r.ok) enviados++;
        }
      }

      // 3. Todos os dias: Tarefas com horário específico (HH:mm)
      for (const t of hojeComHorario) {
        if (horaAtual >= t.horario) {
          const r = await sendWebPushNotification(item.subscription, {
            title: `Lembrete (${t.horario}): ${t.titulo}`,
            body: t.observacoes ? `${t.titulo} — ${t.observacoes}` : t.titulo,
            tag: `tarefa-hora-${t.id}-${hoje}-${t.horario}`,
            renotify: false,
            data: { url: '/tarefas' },
          });
          if (r.ok) enviados++;
        }
      }
    }

    return res.status(200).json({
      ok: true,
      hoje,
      horaAtual,
      isDiaUtil,
      totalSubscriptions: subscriptions.length,
      enviados,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Cron error',
    });
  }
}
