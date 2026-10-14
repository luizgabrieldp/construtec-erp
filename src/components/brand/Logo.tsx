import { cn } from '@/lib/utils';

/** Ícone oficial CONSTRUTEC (emblema gradiente). */
export function ConstrutecIcon({ className }: { className?: string }) {
  return (
    <img
      src="/logo-emblema-trim.png"
      alt="Emblema CONSTRUTEC"
      className={cn('size-8 object-contain select-none shrink-0', className)}
      loading="eager"
    />
  );
}

export interface LogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** força texto branco (ex.: Modo TV sempre escuro) */
  onDark?: boolean;
  className?: string;
  useImageFull?: boolean;
}

const SIZES = {
  sm: { icon: 'size-7', fullH: 'h-8', title: 'text-base', sub: 'text-[9px]' },
  md: { icon: 'size-9', fullH: 'h-9', title: 'text-lg', sub: 'text-[10px]' },
  lg: { icon: 'size-12', fullH: 'h-11', title: 'text-2xl', sub: 'text-xs' },
  xl: { icon: 'size-16', fullH: 'h-14', title: 'text-4xl', sub: 'text-base' },
};

/** Logotipo completo com nome oficial CONSTRUTORA */
export function LogoCompleto({
  size = 'md',
  onDark,
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onDark?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  if (onDark) {
    return (
      <img
        src="/logo-completo-dark-trim.png"
        alt="CONSTRUTEC CONSTRUTORA"
        className={cn(s.fullH, 'w-auto object-contain select-none', className)}
        loading="eager"
      />
    );
  }
  return (
    <div className={cn('inline-flex items-center select-none', className)}>
      <img
        src="/logo-completo-trim.png"
        alt="CONSTRUTEC CONSTRUTORA"
        className={cn(s.fullH, 'w-auto object-contain block dark:hidden')}
        loading="eager"
      />
      <img
        src="/logo-completo-dark-trim.png"
        alt="CONSTRUTEC CONSTRUTORA"
        className={cn(s.fullH, 'w-auto object-contain hidden dark:block')}
        loading="eager"
      />
    </div>
  );
}

export function Logo({ compact, size = 'md', onDark, className, useImageFull = true }: LogoProps) {
  const s = SIZES[size];
  if (compact) {
    return (
      <div className={cn('flex items-center justify-center select-none', className)} aria-label="CONSTRUTEC">
        <ConstrutecIcon className={cn(s.icon, 'shrink-0')} />
      </div>
    );
  }

  if (useImageFull) {
    return <LogoCompleto size={size} onDark={onDark} className={className} />;
  }

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)} aria-label="CONSTRUTEC — Construção e Reformas em Geral">
      <ConstrutecIcon className={cn(s.icon, 'shrink-0')} />
      <div className="leading-none">
        <div className={cn(s.title, 'font-extrabold tracking-tight', onDark ? 'text-white' : 'text-logo')}>CONSTRUTEC</div>
        <div className={cn(s.sub, 'mt-1 font-light tracking-wide', onDark ? 'text-slate-400' : 'text-muted')}>
          construção e reformas em geral
        </div>
      </div>
    </div>
  );
}
