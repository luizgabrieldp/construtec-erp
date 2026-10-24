import { useEffect, useRef, memo } from 'react';

export type AntigravityTone = 'brand' | 'green' | 'red' | 'amber' | 'blue';

export interface AntigravityParticlesCanvasProps {
  tone?: AntigravityTone;
  className?: string;
  particleCount?: number;
}

// Cores de alta fidelidade da identidade visual da CONSTRUTEC e Google Antigravity
const BRAND_AMBER = '#FF6B00';
const GOOGLE_YELLOW = '#F59E0B';
const GOOGLE_BLUE_LIGHT = '#38BDF8';
const GOOGLE_BLUE = '#3B82F6';
const GOOGLE_GREEN = '#10B981';
const GOOGLE_RED = '#EF4444';

function getPaletteForTone(tone?: AntigravityTone): string[] {
  switch (tone) {
    case 'green':
      return [GOOGLE_GREEN, GOOGLE_GREEN, '#34D399', BRAND_AMBER, GOOGLE_BLUE_LIGHT, GOOGLE_YELLOW];
    case 'red':
      return [GOOGLE_RED, GOOGLE_RED, '#F87171', BRAND_AMBER, GOOGLE_YELLOW, GOOGLE_BLUE];
    case 'blue':
      return [GOOGLE_BLUE, GOOGLE_BLUE_LIGHT, '#60A5FA', GOOGLE_GREEN, BRAND_AMBER, GOOGLE_YELLOW];
    case 'amber':
      return [GOOGLE_YELLOW, '#FBBF24', BRAND_AMBER, GOOGLE_BLUE_LIGHT, GOOGLE_GREEN, GOOGLE_RED];
    case 'brand':
    default:
      return [BRAND_AMBER, BRAND_AMBER, GOOGLE_YELLOW, GOOGLE_BLUE_LIGHT, GOOGLE_GREEN, GOOGLE_RED];
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
  type: 'circle' | 'pill' | 'ellipse';
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
}

export const AntigravityParticlesCanvas = memo(function AntigravityParticlesCanvas({
  tone = 'brand',
  className = 'pointer-events-none absolute inset-0 w-full h-full rounded-2xl z-0',
  particleCount = 32,
}: AntigravityParticlesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 1. Verificações de ambiente SSR e detecção estrita de hover (desktop vs mobile)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(hover: hover)');
    if (!mediaQuery.matches) {
      // Telas touch/mobile: 0% de execução de animação para economizar 100% de bateria e CPU
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
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

    // 2. Inicialização do campo de partículas (estilo Google Antigravity)
    const count = Math.max(28, Math.min(particleCount, 40));
    const cols = 8;
    const rows = Math.ceil(count / cols);
    const palette = getPaletteForTone(tone);

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Distribuição uniforme com dispersão suave (evita aglomeração)
      const baseXRatio = (col + 0.2 + Math.random() * 0.6) / cols;
      const baseYRatio = (row + 0.2 + Math.random() * 0.6) / rows;

      const shapeRand = Math.random();
      let type: 'circle' | 'pill' | 'ellipse' = 'circle';
      let radius = 1.1 + Math.random() * 1.3; // 1.1px a 2.4px
      let length = 0;
      let thickness = 0;

      if (shapeRand > 0.65) {
        type = 'pill';
        length = 5 + Math.random() * 4; // 5px a 9px
        thickness = 2.0 + Math.random() * 1.0; // 2.0px a 3.0px
      } else if (shapeRand > 0.45) {
        type = 'ellipse';
        length = 3.2 + Math.random() * 2.2; // raio maior
        thickness = 1.4 + Math.random() * 1.0; // raio menor
      }

      const baseAngle = Math.random() * Math.PI * 2;
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
        alpha: 0.45 + Math.random() * 0.45,
        angle: baseAngle,
        baseAngle,
        vRot: 0,
        driftSpeed: 0.0008 + Math.random() * 0.0012,
        driftPhase: Math.random() * Math.PI * 2,
        driftRadius: 2.5 + Math.random() * 3.5,
      });
    }

    // 3. Ajuste de resolução e DPI (Retina 2x Mac / iPad)
    const updateSize = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.baseX = p.baseXRatio * width;
        p.baseY = p.baseYRatio * height;
        if (p.x === 0 && p.y === 0) {
          p.x = p.baseX;
          p.y = p.baseY;
        }
      }
    };

    updateSize();

    // ResizeObserver para manter nitidez impecável mesmo se o layout mudar
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(parent);
    }

    // 4. Loop de física fluida e renderização do Canvas 2D
    const REPEL_RADIUS = 95;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const SPRING = 0.045;
    const FRICTION = 0.82;
    const CONNECT_DIST = 42;
    const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;

    const renderLoop = (time: number) => {
      // Interpolação de fade suave
      currentOpacity += (targetOpacity - currentOpacity) * 0.12;

      ctx.clearRect(0, 0, width, height);

      let totalVelocity = 0;

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

          if (distSq < REPEL_RADIUS_SQ && distSq > 0.1) {
            const dist = Math.sqrt(distSq);
            const normDist = dist / REPEL_RADIUS;
            const force = Math.pow(1 - normDist, 1.6) * 11;
            const nx = dx / dist;
            const ny = dy / dist;

            // Repulsão radial
            p.vx += nx * force;
            p.vy += ny * force;

            // Vórtice tangencial
            p.vx += -ny * force * 0.26;
            p.vy += nx * force * 0.26;

            // Rotação sutil
            p.vRot += (nx * ny) * 0.08;
          }
        }

        // Retorno elástico (mola e amortecimento)
        p.vx = (p.vx + (targetX - p.x) * SPRING) * FRICTION;
        p.vy = (p.vy + (targetY - p.y) * SPRING) * FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Amortecimento de rotação para o ângulo de repouso
        p.vRot = (p.vRot + (p.baseAngle - p.angle) * 0.04) * 0.85;
        p.angle += p.vRot;

        totalVelocity += Math.abs(p.vx) + Math.abs(p.vy);
      }

      // Conexões ultra-sutis de constelação entre partículas próximas
      if (currentOpacity > 0.04) {
        ctx.lineWidth = 0.75;
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dSq = dx * dx + dy * dy;

            if (dSq < CONNECT_DIST_SQ) {
              const d = Math.sqrt(dSq);
              const lineAlpha = (1 - d / CONNECT_DIST) * 0.16 * currentOpacity;
              ctx.strokeStyle = `rgba(180, 195, 220, ${lineAlpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // Renderização individual com formatos fiéis ao Google Antigravity
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const alpha = p.alpha * currentOpacity;
          if (alpha <= 0.01) continue;

          ctx.fillStyle = p.color;
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

      // Parada completa da animação quando o mouse sai e as partículas assentam (0% CPU)
      if (!mouse.active && currentOpacity < 0.01 && totalVelocity < 0.04) {
        ctx.clearRect(0, 0, width, height);
        animating = false;
        rafId = null;
        return;
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

    parent.addEventListener('pointerenter', handlePointerEnter);
    parent.addEventListener('pointermove', handlePointerMove, { passive: true });
    parent.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      parent.removeEventListener('pointerenter', handlePointerEnter);
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tone, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
});
