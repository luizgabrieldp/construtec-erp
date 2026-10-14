import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'green' | 'red' | 'amber' | 'blue';
  className?: string;
}

const TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  brand: 'bg-brand/10 text-brand',
  green: 'bg-emerald-500/10 text-emerald-500',
  red: 'bg-red-500/10 text-red-500',
  amber: 'bg-amber-500/10 text-amber-500',
  blue: 'bg-sky-500/10 text-sky-500',
};

export function StatCard({ label, value, hint, icon, tone = 'brand', className }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE[tone])}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-fg tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
