import { useEffect, useLayoutEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

export interface TableWatermarkProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Opacidade customizada (padrão calibrado: 0.065 light / 0.09 dark) */
  opacityClassName?: string;
}

const SIZE_CONFIG = {
  sm: {
    sizePx: 200,
    className: 'w-44 h-44 sm:w-52 sm:h-52',
  },
  md: {
    sizePx: 280,
    className: 'w-56 h-56 sm:w-64 sm:h-64',
  },
  lg: {
    sizePx: 360,
    className: 'w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96',
  },
  xl: {
    sizePx: 440,
    className: 'w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] lg:w-[480px] lg:h-[480px]',
  },
};

// Hook isomorfo para garantir que roda antes da pintura em navegadores
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Marca d'água institucional CONSTRUTEC com posicionamento inteligente "Sticky Viewport".
 *
 * O ícone é posicionado a partir da coordenada (0, 0) do container da tabela e calculado
 * dinamicamente a cada scroll. Ele permanece cravado no centro visível da tela (viewport)
 * tanto vertical quanto horizontalmente durante toda a navegação pelos registros,
 * contendo-se com precisão para nunca vazar antes do início ou depois do término da tabela.
 */
export const TableWatermark = memo(function TableWatermark({
  className,
  imgClassName,
  size = 'xl',
  opacityClassName = 'opacity-[0.065] dark:opacity-[0.09]',
}: TableWatermarkProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const config = SIZE_CONFIG[size] || SIZE_CONFIG.xl;

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const root = rootRef.current;
    const floating = floatingRef.current;
    if (!root || !floating) return;

    const parent = root.parentElement || root;
    let rafId: number | null = null;

    const updatePosition = () => {
      const rect = parent.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const topbarOffset = 64; // Altura aproximada do cabeçalho da aplicação
      const viewportCenterY = topbarOffset + (viewportHeight - topbarOffset) / 2;
      const parentHeight = Math.max(rect.height, 100);

      // Metade do ícone e margem de segurança
      const iconHalfHeight = config.sizePx / 2;
      const padding = 16;

      // 1. Cálculo do eixo Y:
      // Posição que o centro do ícone deve ter a partir do topo do pai (rect.top)
      // para coincidir exatamente com viewportCenterY na tela:
      const desiredY = viewportCenterY - rect.top;

      // Limites de contenção dentro do container pai
      const minY = Math.min(parentHeight / 2, iconHalfHeight + padding);
      const maxY = Math.max(parentHeight / 2, parentHeight - iconHalfHeight - padding);
      const clampedY = Math.max(minY, Math.min(maxY, desiredY));

      // 2. Cálculo do eixo X:
      // Centraliza na porção visível do container pai na tela
      const viewportWidth = window.innerWidth;
      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(viewportWidth, rect.right);
      const viewportCenterX = (visibleLeft + visibleRight) / 2;
      const desiredX = viewportCenterX - rect.left;

      const iconHalfWidth = config.sizePx / 2;
      const minX = Math.min(rect.width / 2, iconHalfWidth + padding);
      const maxX = Math.max(rect.width / 2, rect.width - iconHalfWidth - padding);
      const clampedX = Math.max(minX, Math.min(maxX, desiredX));

      // 3. Aplica o posicionamento relativo a (0, 0) com centralização
      floating.style.transform = `translate3d(${Math.round(clampedX)}px, ${Math.round(clampedY)}px, 0) translate(-50%, -50%)`;
    };

    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    // Executa imediatamente na montagem
    updatePosition();
    const t1 = setTimeout(updatePosition, 50);
    const t2 = setTimeout(updatePosition, 250);

    // ResizeObserver no container pai para recalcular quando os dados da tabela carregarem
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.observe(parent);
    }

    // IntersectionObserver para suspender renderização fora da tela e reativar na aproximação
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            updatePosition();
          }
        },
        { rootMargin: '200px 0px 200px 0px' },
      );
      intersectionObserver.observe(parent);
    }

    // Escuta com capture: true para garantir captura de scroll no Safari, Mac e iPad
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('scroll', handleScrollOrResize, true);
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
      {/* Posicionado a partir de top-0 left-0 para que translate3d(clampedX, clampedY) seja matematicamente exato */}
      <div
        ref={floatingRef}
        className="absolute top-0 left-0 flex items-center justify-center will-change-transform pointer-events-none"
        style={{
          // Fallback inicial centrado antes de rodar qualquer cálculo
          transform: 'translate3d(50%, 50%, 0) translate(-50%, -50%)',
        }}
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
