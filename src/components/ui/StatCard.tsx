import type { MouseEventHandler, ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'green' | 'red' | 'amber' | 'blue';
  className?: string;
  to?: To;
  onClick?: MouseEventHandler<HTMLElement>;
  title?: string;
  'aria-label'?: string;
}

const TONE_THEME: Record<
  NonNullable<StatCardProps['tone']>,
  { badge: string; accent: string }
> = {
  brand: {
    badge: 'bg-brand/10 text-brand border border-brand/20',
    accent: 'border-l-brand',
  },
  green: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    accent: 'border-l-emerald-500',
  },
  red: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    accent: 'border-l-red-500',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    accent: 'border-l-amber-500',
  },
  blue: {
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    accent: 'border-l-sky-500',
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  className,
  to,
  onClick,
  title,
  'aria-label': ariaLabel,
}: StatCardProps) {
  const isClickable = Boolean(to || onClick);
  const theme = TONE_THEME[tone];

  const cardClasses = cn(
    'group relative overflow-hidden rounded-xl border border-line border-l-[3px] bg-surface p-3.5 sm:p-5 transition-colors duration-150',
    theme.accent,
    isClickable &&
      'block w-full text-left select-none cursor-pointer hover:border-brand/50 hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    className,
  );

  const innerContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted leading-tight line-clamp-1">
            {label}
          </span>
          <span
            className={cn(
              'grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg',
              theme.badge,
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
        <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums leading-tight truncate">
          {value}
        </div>
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] sm:text-xs text-muted leading-snug line-clamp-1">
          {hint}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cardClasses}
        title={title}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {innerContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cardClasses}
        title={title}
        aria-label={ariaLabel}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div className={cardClasses} title={title} aria-label={ariaLabel}>
      {innerContent}
    </div>
  );
}
