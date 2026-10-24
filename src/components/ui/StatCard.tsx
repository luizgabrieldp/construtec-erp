import type { MouseEventHandler, ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AntigravityParticlesCanvas } from './AntigravityParticlesCanvas';

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

interface ToneConfig {
  badge: string;
  radial: string;
  border: string;
  particle: string;
  particleGlow: string;
}

const TONE_THEME: Record<NonNullable<StatCardProps['tone']>, ToneConfig> = {
  brand: {
    badge: 'bg-brand/10 text-brand',
    radial: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.4)',
    particle: '#F59E0B',
    particleGlow: 'rgba(245, 158, 11, 0.6)',
  },
  green: {
    badge: 'bg-emerald-500/10 text-emerald-500',
    radial: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.4)',
    particle: '#10B981',
    particleGlow: 'rgba(16, 185, 129, 0.6)',
  },
  red: {
    badge: 'bg-red-500/10 text-red-500',
    radial: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(239, 68, 68, 0.4)',
    particle: '#EF4444',
    particleGlow: 'rgba(239, 68, 68, 0.6)',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-500',
    radial: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.4)',
    particle: '#F59E0B',
    particleGlow: 'rgba(245, 158, 11, 0.6)',
  },
  blue: {
    badge: 'bg-sky-500/10 text-sky-500',
    radial: 'rgba(14, 165, 233, 0.14)',
    border: 'rgba(14, 165, 233, 0.4)',
    particle: '#0EA5E9',
    particleGlow: 'rgba(14, 165, 233, 0.6)',
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

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--mouse-x', '-100px');
    e.currentTarget.style.setProperty('--mouse-y', '-100px');
  };

  const cardClasses = cn(
    'group relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 sm:p-5 transition-all duration-300 ease-out sm:hover:-translate-y-1 sm:hover:shadow-lg sm:hover:shadow-black/5 dark:sm:hover:shadow-black/20',
    isClickable &&
      'block w-full text-left select-none cursor-pointer hover:border-brand/40 hover:bg-surface-2/40 active:scale-98 sm:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    className,
  );

  const innerContent = (
    <>
      {/* Halo de luz que segue o cursor (Spotlight Antigravity) */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x, -100px) var(--mouse-y, -100px), ${theme.radial}, transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* Destaque sutil da borda que segue o ponteiro */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(220px circle at var(--mouse-x, -100px) var(--mouse-y, -100px), ${theme.border}, transparent 75%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        aria-hidden="true"
      />

      {/* Constelação orgânica e interativa de dezenas de partículas fluidas (Estilo Google Antigravity) */}
      <AntigravityParticlesCanvas tone={tone} />

      {/* Conteúdo do Card */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted leading-tight line-clamp-1 transition-colors duration-200 group-hover:text-fg/80">
              {label}
            </span>
            <span
              className={cn(
                'grid size-7 sm:size-9 shrink-0 place-items-center rounded-lg sm:rounded-xl transition-all duration-300 ease-out group-hover:scale-115 group-hover:-rotate-3 group-hover:shadow-sm [&>svg]:transition-transform [&>svg]:duration-500 group-hover:[&>svg]:scale-110 group-hover:[&>svg]:rotate-6',
                theme.badge,
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums leading-tight truncate transition-transform duration-200 group-hover:translate-x-0.5">
            {value}
          </div>
        </div>
        {hint && (
          <div className="mt-1 text-[11px] sm:text-xs text-muted leading-snug line-clamp-1 transition-colors duration-200 group-hover:text-muted/90">
            {hint}
          </div>
        )}
      </div>
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div
      className={cardClasses}
      title={title}
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {innerContent}
    </div>
  );
}
