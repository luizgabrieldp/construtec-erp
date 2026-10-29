import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

export interface TableWatermarkProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Opacidade customizada caso necessário (padrão: 0.055 light / 0.075 dark) */
  opacityClassName?: string;
}

const SIZE_CONFIG = {
  sm: {
    sizePx: 220,
    className: 'w-48 h-48 sm:w-56 sm:h-56',
  },
  md: {
    sizePx: 300,
    className: 'w-64 h-64 sm:w-72 sm:h-72',
  },
  lg: {
    sizePx: 380,
    className: 'w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96',
  },
  xl: {
    sizePx: 460,
    className: 'w-72 h-72 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] lg:w-[480px] lg:h-[480px]',
  },
};

/**
 * Marca d'água oficial CONSTRUTEC com posicionamento inteligente "Sticky Viewport".
 *
 * Enquanto a tabela/lista estiver passando pela tela, o ícone permanece
 * perfeitamente travado no centro visível da viewport (horizontal e verticalmente).
 * Ao atingir o início ou término da tabela, o ícone é contido com precisão
 * milimétrica dentro do container e sai suavemente da visão.
 */
export const TableWatermark = memo(function TableWatermark({
  className,
  imgClassName,
  size = 'xl',
  opacityClassName = 'opacity-[0.055] dark:opacity-[0.075]',
}: TableWatermarkProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const config = SIZE_CONFIG[size] || SIZE_CONFIG.xl;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = rootRef.current;
    const floating = floatingRef.current;
    if (!root || !floating) return;

    const parent = root.parentElement || root;
    let rafId: number | null = null;
    let isIntersecting = true;

    const updatePosition = () => {
      if (!isIntersecting) return;

      const rect = parent.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const topbarOffset = 64; // Altura aproximada do cabeçalho da aplicação
      const viewportCenterY = topbarOffset + (viewportHeight - topbarOffset) / 2;
      const parentHeight = rect.height;

      // Se estiver totalmente fora da viewport, pular cálculo
      if (rect.bottom < 0 || rect.top > viewportHeight) {
        return;
      }

      const iconHalfHeight = config.sizePx / 2;
      const padding = 16;

      // Cálculo vertical com contenção estrita nos limites da tabela
      const desiredY = viewportCenterY - rect.top;
      const minY = Math.min(parentHeight / 2, iconHalfHeight + padding);
      const maxY = Math.max(parentHeight / 2, parentHeight - iconHalfHeight - padding);
      const clampedY = Math.max(minY, Math.min(maxY, desiredY));

      // Cálculo horizontal com centralização na porção visível do container
      const viewportWidth = window.innerWidth;
      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(viewportWidth, rect.right);
      const viewportCenterX = (visibleLeft + visibleRight) / 2;
      const desiredX = viewportCenterX - rect.left;

      const iconHalfWidth = config.sizePx / 2;
      const minX = Math.min(rect.width / 2, iconHalfWidth + padding);
      const maxX = Math.max(rect.width / 2, rect.width - iconHalfWidth - padding);
      const clampedX = Math.max(minX, Math.min(maxX, desiredX));

      floating.style.transform = `translate3d(${Math.round(clampedX)}px, ${Math.round(clampedY)}px, 0) translate(-50%, -50%)`;
    };

    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    // Atualização imediata no carregamento
    updatePosition();
    const timer = setTimeout(updatePosition, 80);

    // Observer para pausar listener quando o elemento estiver longe da tela
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting = entry?.isIntersecting ?? true;
          if (isIntersecting) {
            updatePosition();
          }
        },
        { rootMargin: '100px 0px 100px 0px' },
      );
      observer.observe(parent);
    }

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [config.sizePx]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none select-none absolute inset-0 z-0 overflow-hidden print:hidden',
        className,
      )}
    >
      <div
        ref={floatingRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center will-change-transform"
      >
        <img
          src="/logo-emblema-trim.png"
          alt=""
          className={cn(
            'object-contain max-w-[85vw] max-h-[85vh]',
            config.className,
            opacityClassName,
            imgClassName,
          )}
        />
      </div>
    </div>
  );
});
