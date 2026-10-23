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

const TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  brand: 'bg-brand/10 text-brand',
  green: 'bg-emerald-500/10 text-emerald-500',
  red: 'bg-red-500/10 text-red-500',
  amber: 'bg-amber-500/10 text-amber-500',
  blue: 'bg-sky-500/10 text-sky-500',
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

  const cardClasses = cn(
    'rounded-2xl border border-line bg-surface p-3.5 sm:p-5',
    isClickable &&
      'block w-full text-left select-none cursor-pointer transition-all duration-200 ease-out hover:border-brand/40 hover:bg-surface-2/40 hover:shadow-sm active:scale-98 sm:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    className,
  );

  const innerContent = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted leading-tight line-clamp-1">
          {label}
        </span>
        <span
          className={cn('grid size-7 sm:size-9 shrink-0 place-items-center rounded-lg sm:rounded-xl', TONE[tone])}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums leading-tight truncate">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] sm:text-xs text-muted leading-snug line-clamp-1">{hint}</div>}
    </>
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
