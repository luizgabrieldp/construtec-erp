import { parseISO } from './dates';
import type { ISODate } from '@/domain/types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const fmtBRL = (v: number) => brl.format(v || 0);
export const fmtBRLCompact = (v: number) => brlCompact.format(v || 0);
export const fmtNum = (v: number) => num.format(v || 0);
export const fmtPct = (v: number) => pct.format(Number.isFinite(v) ? v : 0);

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const dateLong = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

export const fmtDate = (s?: ISODate) => (s ? dateFmt.format(parseISO(s)) : '—');
export const fmtDateShort = (s: ISODate) => dateShort.format(parseISO(s)).replace('.', '');
export const fmtDateLong = (s: ISODate) => dateLong.format(parseISO(s));
export const fmtMonth = (key: string) => monthFmt.format(parseISO(`${key}-01`)).replace('.', '');

/** Arredonda para centavos. */
export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
