export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${prefix ? '_' : ''}${Date.now().toString(36)}${rnd}`;
}

export { clsx as cn } from 'clsx';

export function waUrl(telefone?: string | null): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const numero = digits.length >= 12 && digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${numero}`;
}

export function normalizarTexto(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

