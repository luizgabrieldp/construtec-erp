const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const CODIGO_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle indisponível neste ambiente.');
  }
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const saltBuffer = new Uint8Array(salt).buffer;
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('WebCrypto getRandomValues indisponível neste ambiente.');
  }
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

export interface VerifyPasswordResult {
  valid: boolean;
  needsMigration: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<VerifyPasswordResult> {
  if (!stored || typeof stored !== 'string') {
    return { valid: false, needsMigration: false };
  }

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) {
      return { valid: false, needsMigration: false };
    }
    const iterations = Number(parts[1]);
    const salt = hexToBytes(parts[2]);
    const expected = hexToBytes(parts[3]);
    if (!Number.isInteger(iterations) || iterations < 1 || !salt || !expected) {
      return { valid: false, needsMigration: false };
    }
    const derived = await derivePbkdf2(password, salt, iterations);
    const valid = constantTimeEqual(derived, expected);
    return { valid, needsMigration: false };
  }

  // Conta legada em texto puro: compara e sinaliza migração para PBKDF2
  const encoder = new TextEncoder();
  const valid = constantTimeEqual(encoder.encode(password), encoder.encode(stored));
  return { valid, needsMigration: valid };
}

export function gerarCodigoSeguro(prefixo = '', tamanho = 6): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('WebCrypto getRandomValues indisponível neste ambiente.');
  }
  const len = Math.max(1, Math.floor(tamanho));
  const randomBytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(randomBytes);
  let body = '';
  for (let i = 0; i < len; i += 1) {
    body += CODIGO_ALFABETO[randomBytes[i] % CODIGO_ALFABETO.length];
  }
  return prefixo ? `${prefixo}${body}` : body;
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeCsvCell(val: unknown): string {
  const raw = val === null || val === undefined ? '' : String(val);
  const trimmedStart = raw.replace(/^\s+/, '');
  const neutralizado = /^[=+\-@\t\r]/.test(raw) || /^[=+\-@\t\r]/.test(trimmedStart) ? `'${raw}` : raw;
  const escaped = neutralizado.replace(/"/g, '""');
  return `"${escaped}"`;
}
