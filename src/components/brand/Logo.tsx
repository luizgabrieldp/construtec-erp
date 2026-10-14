import { cn } from '@/lib/utils';

/** Ícone vetorial oficial CONSTRUTEC (casa/espiral). */
export function ConstrutecIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Chaminé e Telhado */}
      <path d="M42 28V36L52 28L80 50V82H68V54L52 42L28 60V82H20V50L42 33V28H42Z" fill="#FF6B00" />
      {/* Espiral / Fundação interna */}
      <path d="M40 76V52H62V76H50V62H54V70H58V58H46V76H40Z" fill="#FF6B00" />
    </svg>
  );
}

interface LogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** força texto branco (ex.: Modo TV sempre escuro) */
  onDark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 'size-7', title: 'text-base', sub: 'text-[9px]' },
  md: { icon: 'size-9', title: 'text-lg', sub: 'text-[10px]' },
  lg: { icon: 'size-12', title: 'text-2xl', sub: 'text-xs' },
  xl: { icon: 'size-16', title: 'text-4xl', sub: 'text-base' },
};

export function Logo({ compact, size = 'md', onDark, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)} aria-label="CONSTRUTEC — construção e reformas em geral">
      <ConstrutecIcon className={cn(s.icon, 'shrink-0')} />
      {!compact && (
        <div className="leading-none">
          <div className={cn(s.title, 'font-extrabold tracking-tight', onDark ? 'text-white' : 'text-logo')}>CONSTRUTEC</div>
          <div className={cn(s.sub, 'mt-1 font-light tracking-wide', onDark ? 'text-slate-400' : 'text-muted')}>
            construção e reformas em geral
          </div>
        </div>
      )}
    </div>
  );
}
