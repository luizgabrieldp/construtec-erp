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
    <div className={cn('rounded-2xl border border-line bg-surface p-3.5 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted leading-tight line-clamp-1">
          {label}
        </span>
        <span className={cn('grid size-7 sm:size-9 shrink-0 place-items-center rounded-lg sm:rounded-xl', TONE[tone])}>
          {icon}
        </span>
      </div>
      <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums leading-tight truncate">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] sm:text-xs text-muted leading-snug line-clamp-1">{hint}</div>}
    </div>
  );
}
