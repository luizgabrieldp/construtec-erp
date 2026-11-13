import { FIRESTORE_BASE_URL, sendWebPushNotification, VAPID_PUBLIC_KEY } from './_webpush.js';

async function carregarSubscriptionsFirestore() {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/construtec_erp/push_subscriptions`);
    if (!res.ok) return [];
    const doc = await res.json();
    const rawJson = doc?.fields?.payload?.stringValue;
    if (!rawJson) return [];
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      vapidPublicKey: VAPID_PUBLIC_KEY,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { subscription, destinatarioTipo, destinatarioId, criadoPorId, notification } = body;

    if (!notification || !notification.title) {
      return res.status(400).json({ error: 'Missing notification title' });
    }

    const targets = [];

    // Se enviou uma subscription direta (ex: teste imediato do dispositivo)
    if (subscription && subscription.endpoint && subscription.keys) {
      targets.push(subscription);
    } else {
      const todas = await carregarSubscriptionsFirestore();
      for (const item of todas) {
        if (!item?.subscription?.endpoint) continue;
        const isTodos = !destinatarioTipo || destinatarioTipo === 'todos';
        const isDestinatario = destinatarioId && item.usuarioId === destinatarioId;
        const isCriador = criadoPorId && item.usuarioId === criadoPorId;
        if (isTodos || isDestinatario || isCriador) {
          targets.push(item.subscription);
        }
      }
    }

    const results = await Promise.allSettled(
      targets.map((sub) => sendWebPushNotification(sub, notification)),
    );

    const enviados = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
    return res.status(200).json({
      ok: true,
      totalTargets: targets.length,
      enviados,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Internal error',
    });
  }
}
