import crypto from 'node:crypto';

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BF8LPrKxN_d4mvm15EDeeywp8eKTmF_iGky1ENIlQEZPdh9ropt15QQjNuC0y5Chw-i3kdULZrOgQ1mRPqxahts';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'WbiOfipAt9QfS16YCLcskP1kIkGsTeyylzTFVScvvvo';

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@construtec.app';

export const FIRESTORE_BASE_URL =
  'https://firestore.googleapis.com/v1/projects/construtec-erp-2026/databases/(default)/documents';

function base64UrlToBuffer(str) {
  return Buffer.from(str, 'base64url');
}

function bufferToBase64Url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function createVapidJwt(audienceOrigin) {
  const pubBuf = base64UrlToBuffer(VAPID_PUBLIC_KEY);
  const x = bufferToBase64Url(pubBuf.subarray(1, 33));
  const y = bufferToBase64Url(pubBuf.subarray(33, 65));
  const d = VAPID_PRIVATE_KEY;

  const privateKey = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x, y, d },
    format: 'jwk',
  });

  const header = bufferToBase64Url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = bufferToBase64Url(
    JSON.stringify({
      aud: audienceOrigin,
      exp: nowSec + 12 * 3600,
      sub: VAPID_SUBJECT,
    }),
  );

  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(unsignedToken), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${unsignedToken}.${bufferToBase64Url(signature)}`;
}

/**
 * Criptografa payload Web Push de acordo com a RFC 8291 (aes128gcm)
 */
function encryptWebPushPayload(subscription, payloadString) {
  const clientPublicKey = base64UrlToBuffer(subscription.keys.p256dh);
  const userAuth = base64UrlToBuffer(subscription.keys.auth);

  const serverECDH = crypto.createECDH('prime256v1');
  serverECDH.generateKeys();
  const serverPublicKey = serverECDH.getPublicKey();
  const sharedSecret = serverECDH.computeSecret(clientPublicKey);

  const salt = crypto.randomBytes(16);

  // RFC 8291 Key Derivation
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    clientPublicKey,
    serverPublicKey,
  ]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, userAuth, keyInfo, 32));

  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
  const contentEncryptionKey = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, cekInfo, 16));

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii');
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, nonceInfo, 12));

  // Plaintext + delimiter 0x02
  const plaintext = Buffer.concat([Buffer.from(payloadString, 'utf-8'), Buffer.from([2])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', contentEncryptionKey, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  // Cabeçalho aes128gcm: salt (16) + rs (4, uint32BE = 4096) + idlen (1 = 65) + keyid (65 = serverPublicKey)
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const idLen = Buffer.from([serverPublicKey.length]);

  return Buffer.concat([salt, recordSize, idLen, serverPublicKey, encrypted]);
}

/**
 * Dispara um Web Push criptografado (RFC 8291 + RFC 8292 VAPID) para uma PushSubscription
 */
export async function sendWebPushNotification(subscription, payloadObj) {
  if (
    !subscription ||
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return { ok: false, status: 400, reason: 'invalid_subscription' };
  }

  const endpointUrl = new URL(subscription.endpoint);
  const audienceOrigin = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = createVapidJwt(audienceOrigin);
  const payloadString = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);
  const bodyBuffer = encryptWebPushPayload(subscription, payloadString);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body: bodyBuffer,
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}
