import { useEffect, useRef, memo } from 'react';

export type AntigravityTone = 'brand' | 'green' | 'red' | 'amber' | 'blue';

export interface AntigravityParticlesCanvasProps {
  tone?: AntigravityTone;
  className?: string;
  particleCount?: number;
  isHovered?: boolean;
}

// Paleta de alta fidelidade: identidade visual da CONSTRUTEC e Google Antigravity
const BRAND_ORANGE = '#FF6B00';
const GOOGLE_AMBER = '#F59E0B';
const GOOGLE_SKY = '#38BDF8';
const GOOGLE_BLUE = '#3B82F6';
const GOOGLE_EMERALD = '#10B981';
const GOOGLE_CORAL = '#EF4444';

function getPaletteForTone(tone?: AntigravityTone): string[] {
  switch (tone) {
    case 'green':
      return [GOOGLE_EMERALD, GOOGLE_EMERALD, '#34D399', BRAND_ORANGE, GOOGLE_SKY, GOOGLE_AMBER];
    case 'red':
      return [GOOGLE_CORAL, GOOGLE_CORAL, '#F87171', BRAND_ORANGE, GOOGLE_AMBER, GOOGLE_BLUE];
    case 'blue':
      return [GOOGLE_BLUE, GOOGLE_SKY, '#60A5FA', GOOGLE_EMERALD, BRAND_ORANGE, GOOGLE_AMBER];
    case 'amber':
      return [GOOGLE_AMBER, '#FBBF24', BRAND_ORANGE, GOOGLE_SKY, GOOGLE_EMERALD, GOOGLE_CORAL];
    case 'brand':
    default:
      return [BRAND_ORANGE, BRAND_ORANGE, GOOGLE_AMBER, GOOGLE_SKY, GOOGLE_EMERALD, GOOGLE_CORAL];
  }
}

interface Particle {
  baseXRatio: number;
  baseYRatio: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'circle' | 'pill' | 'ring' | 'ellipse';
  length: number;
  thickness: number;
  color: string;
  alpha: number;
  angle: number;
  baseAngle: number;
  vRot: number;
  driftSpeed: number;
  driftPhase: number;
  driftRadius: number;
  initialized: boolean;
}

export const AntigravityParticlesCanvas = memo(function AntigravityParticlesCanvas({
  tone = 'brand',
  className = 'pointer-events-none absolute inset-0 w-full h-full rounded-2xl z-0',
  particleCount = 52,
  isHovered,
}: AntigravityParticlesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Armazenar callbacks e refs para controle externo de isHovered se fornecido
  const controlRef = useRef<{
    setHovered?: (hovered: boolean) => void;
  }>({});

  useEffect(() => {
    // 1. Verificações de ambiente SSR, detecção de hover e acessibilidade
    if (typeof window === 'undefined') return;

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(hover: hover)') : null;
    if (mediaQuery && !mediaQuery.matches) {
      // Telas touch/mobile: 0% de execução de animação para economizar 100% de bateria e CPU
      return;
    }

    const reducedMotion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (reducedMotion && reducedMotion.matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animating = false;
    let rafId: number | null = null;
    let currentOpacity = 0;
    let targetOpacity = 0;

    const mouse = {
      x: -999,
      y: -999,
      active: false,
    };

    // 2. Inicialização do campo de partículas (estilo visual Google Antigravity orbital & disperso)
    const count = Math.max(36, Math.min(particleCount, 68));
    const palette = getPaletteForTone(tone);

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      // Distribuição mista: 65% em anéis/órbitas concêntricas suaves e 35% dispersos pelo card
      let baseXRatio: number;
      let baseYRatio: number;
      let baseAngle: number;

      if (i < Math.floor(count * 0.65)) {
        // Órbita elíptica em torno do centro do card (estilo halo Google Antigravity)
        const angle = (i / Math.floor(count * 0.65)) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
        const ringRadius = 0.28 + (i % 3) * 0.14 + (Math.random() * 0.08 - 0.04);
        baseXRatio = 0.5 + Math.cos(angle) * (ringRadius * 0.85);
        baseYRatio = 0.5 + Math.sin(angle) * ringRadius;
        baseAngle = angle + Math.PI / 2; // Alinhado tangencialmente à órbita
      } else {
        // Dispersão espacial orgânica nos cantos e áreas livres
        baseXRatio = 0.08 + Math.random() * 0.84;
        baseYRatio = 0.08 + Math.random() * 0.84;
        baseAngle = Math.random() * Math.PI * 2;
      }

      const shapeRand = Math.random();
      let type: 'circle' | 'pill' | 'ring' | 'ellipse' = 'circle';
      let radius = 1.0 + Math.random() * 1.3; // 1.0px a 2.3px
      let length = 0;
      let thickness = 0;

      if (shapeRand > 0.62) {
        type = 'pill';
        length = 4.0 + Math.random() * 2.8; // 4.0px a 6.8px
        thickness = 1.4 + Math.random() * 0.6; // 1.4px a 2.0px
      } else if (shapeRand > 0.45) {
        type = 'ring';
        radius = 1.6 + Math.random() * 0.7; // 1.6px a 2.3px
        thickness = 0.7 + Math.random() * 0.3; // 0.7px a 1.0px
      } else if (shapeRand > 0.30) {
        type = 'ellipse';
        length = 2.2 + Math.random() * 1.0; // radiusX
        thickness = 1.1 + Math.random() * 0.5; // radiusY
      }

      const color = palette[i % palette.length];

      particles.push({
        baseXRatio,
        baseYRatio,
        baseX: 0,
        baseY: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius,
        type,
        length,
        thickness,
        color,
        alpha: 0.5 + Math.random() * 0.45,
        angle: baseAngle,
        baseAngle,
        vRot: 0,
        driftSpeed: 0.0008 + Math.random() * 0.0012,
        driftPhase: Math.random() * Math.PI * 2,
        driftRadius: 2.5 + Math.random() * 3.5,
        initialized: false,
      });
    }

    // 3. Resolução e DPI Retina (2x Mac/iPad)
    const updateSize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(0, rect.width);
      height = Math.max(0, rect.height);
      if (width === 0 || height === 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.baseX = p.baseXRatio * width;
        p.baseY = p.baseYRatio * height;
        if (!p.initialized) {
          p.x = p.baseX;
          p.y = p.baseY;
          p.initialized = true;
        }
      }
    };

    updateSize();

    // ResizeObserver com fallback para evento resize da janela
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(parent);
    }
    window.addEventListener('resize', updateSize);

    // 4. Parâmetros de física fluida e amortecimento estável
    const REPEL_RADIUS = 90;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const SPRING = 0.055;
    const FRICTION = 0.82;

    const renderLoop = (time: number) => {
      // Interpolação de fade suave
      currentOpacity += (targetOpacity - currentOpacity) * 0.16;

      // Parada completa da animação quando o mouse sai e o fade-out conclui (0% CPU e bateria)
      if (!mouse.active && currentOpacity < 0.005) {
        currentOpacity = 0;
        ctx.clearRect(0, 0, width, height);
        animating = false;
        rafId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Atualização física das partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift senoidal orgânico
        const driftX = Math.sin(time * p.driftSpeed + p.driftPhase) * p.driftRadius;
        const driftY = Math.cos(time * p.driftSpeed * 0.85 + p.driftPhase) * (p.driftRadius * 0.85);
        const targetX = p.baseX + driftX;
        const targetY = p.baseY + driftY;

        // Campo magnético fluido de repulsão com o cursor
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < REPEL_RADIUS_SQ && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const norm = 1 - dist / REPEL_RADIUS;
            const force = norm * norm * 4.2;
            const nx = dx / dist;
            const ny = dy / dist;

            // Repulsão radial suave
            p.vx += nx * force;
            p.vy += ny * force;

            // Vórtice tangencial fluido
            const swirlDirection = p.driftPhase > Math.PI ? 1 : -1;
            p.vx += -ny * force * 0.22 * swirlDirection;
            p.vy += nx * force * 0.22 * swirlDirection;

            // Perturbação de rotação orgânica
            p.vRot += (nx * ny) * 0.04 + norm * 0.03 * swirlDirection;
          }
        }

        // Retorno elástico (mola suave e amortecimento com fricção)
        p.vx = (p.vx + (targetX - p.x) * SPRING) * FRICTION;
        p.vy = (p.vy + (targetY - p.y) * SPRING) * FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Amortecimento de rotação para orientação estável
        p.vRot = (p.vRot + (p.baseAngle - p.angle) * 0.05) * 0.86;
        p.angle += p.vRot;
      }

      // Renderização das partículas no Canvas 2D
      if (currentOpacity > 0.005) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const alpha = p.alpha * currentOpacity;
          if (alpha <= 0.01) continue;

          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = alpha;

          if (p.type === 'circle') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'pill') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(-p.length / 2, -p.thickness / 2, p.length, p.thickness, p.thickness / 2);
            } else {
              ctx.ellipse(0, 0, p.length / 2, p.thickness / 2, 0, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore();
          } else if (p.type === 'ring') {
            ctx.save();
            ctx.lineWidth = p.thickness;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          } else if (p.type === 'ellipse') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.length, p.thickness, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    const startAnimation = () => {
      targetOpacity = 1;
      if (!animating) {
        animating = true;
        rafId = requestAnimationFrame(renderLoop);
      }
    };

    const handlePointerEnter = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      startAnimation();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      startAnimation();
    };

    const handlePointerLeave = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      targetOpacity = 0;
      mouse.active = false;
      mouse.x = -999;
      mouse.y = -999;
    };

    const handleVisibilityChange = () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
        animating = false;
      }
    };

    const handleWindowBlur = () => {
      if (mouse.active) {
        targetOpacity = 0;
        mouse.active = false;
      }
    };

    // Registrar controle para o caso de prop isHovered externa
    controlRef.current.setHovered = (hovered: boolean) => {
      if (hovered) {
        const rect = parent.getBoundingClientRect();
        if (mouse.x === -999) {
          mouse.x = rect.width / 2;
          mouse.y = rect.height / 2;
        }
        mouse.active = true;
        startAnimation();
      } else {
        targetOpacity = 0;
        mouse.active = false;
        mouse.x = -999;
        mouse.y = -999;
      }
    };

    parent.addEventListener('pointerenter', handlePointerEnter);
    parent.addEventListener('pointermove', handlePointerMove, { passive: true });
    parent.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSize);
      parent.removeEventListener('pointerenter', handlePointerEnter);
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      controlRef.current.setHovered = undefined;
    };
  }, [tone, particleCount]);

  // Se a prop isHovered for explicitamente passada, refletir no loop
  useEffect(() => {
    if (isHovered !== undefined && controlRef.current.setHovered) {
      controlRef.current.setHovered(isHovered);
    }
  }, [isHovered]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
});
