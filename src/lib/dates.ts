import type { ISODate } from '@/domain/types';

/** Datas locais como "YYYY-MM-DD", sem conversão de fuso. */
const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

/** Diferença em dias (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Segunda-feira da semana da data. */
export function startOfWeek(s: ISODate): ISODate {
  const d = parseISO(s);
  const dow = d.getDay(); // 0 = domingo
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDays(s, delta);
}

export function startOfMonth(s: ISODate): ISODate {
  return `${s.slice(0, 7)}-01`;
}

export function endOfMonth(s: ISODate): ISODate {
  const d = parseISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function weekday(s: ISODate): number {
  return parseISO(s).getDay();
}

/** Intervalo inclusivo de datas. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Dias úteis de obra no mês (segunda a sábado). */
export function diasUteisMes(s: ISODate): number {
  return eachDay(startOfMonth(s), endOfMonth(s)).filter((d) => weekday(d) !== 0).length;
}

export function isBetween(s: ISODate, from: ISODate, to: ISODate): boolean {
  return s >= from && s <= to;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}
