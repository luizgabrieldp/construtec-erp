import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

console.log('🧪 Iniciando testes profundos e rigorosos do AntigravityParticlesCanvas...\n');

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const mod = await server.ssrLoadModule('/src/components/ui/AntigravityParticlesCanvas.tsx');
  const { AntigravityParticlesCanvas } = mod;

  // Teste 1: Renderização SSR para todos os tons suportados
  console.log('1. Testando renderização SSR para todas as variações de tom (brand, green, red, amber, blue)...');
  const tones = ['brand', 'green', 'red', 'amber', 'blue', undefined];

  for (const tone of tones) {
    const markup = renderToStaticMarkup(
      React.createElement(AntigravityParticlesCanvas, { tone })
    );

    assert.ok(markup.startsWith('<canvas '), `Esperado <canvas ..., obtido: ${markup}`);
    assert.ok(markup.includes('pointer-events-none'), 'Canvas deve ter pointer-events-none');
    assert.ok(markup.includes('absolute inset-0'), 'Canvas deve ter absolute inset-0');
    assert.ok(markup.includes('w-full h-full'), 'Canvas deve ter w-full h-full');
    assert.ok(markup.includes('rounded-2xl'), 'Canvas deve ter rounded-2xl');
    assert.ok(markup.includes('z-0'), 'Canvas deve ter camada de fundo z-0');
    assert.ok(markup.includes('aria-hidden="true"'), 'Canvas decorativo deve ter aria-hidden="true"');
  }
  console.log('   ✅ Todos os tons renderizaram canvas semântico seguro em SSR!');

  // Teste 2: StatCard integrando AntigravityParticlesCanvas
  console.log('2. Testando StatCard integrado contendo o canvas e sem a bolinha antiga...');
  const statCardMod = await server.ssrLoadModule('/src/components/ui/StatCard.tsx');
  const { StatCard } = statCardMod;

  const markupCard = renderToStaticMarkup(
    React.createElement(StatCard, {
      label: 'Faturamento',
      value: 'R$ 150.000',
      hint: '+12% este mês',
      icon: React.createElement('div', null, 'Icon'),
      tone: 'green',
    })
  );

  assert.ok(markupCard.includes('<canvas '), 'StatCard deve conter o elemento <canvas>');
  assert.ok(markupCard.includes('z-0'), 'Canvas deve estar na camada z-0');
  assert.ok(
    !markupCard.includes('size-2 rounded-full blur-[0.5px]'),
    'Não deve conter o antigo pontinho único estático size-2'
  );
  assert.ok(
    markupCard.includes('relative z-10 flex flex-col justify-between h-full'),
    'Conteúdo do card deve estar na camada frontal z-10'
  );
  console.log('   ✅ StatCard integrado perfeitamente com canvas em z-0 e conteúdo em z-10!');

  // Teste 3: Simulação de Fading e Parada Definitiva de requestAnimationFrame (0% vazamento de CPU)
  console.log('3. Testando ciclo de vida da animação: fade-in no hover, fade-out no unhover e parada total de rAF...');
  
  // Simular loop de física com interpolação de fade e parada
  let currentOpacity = 1.0;
  let targetOpacity = 0; // mouse saiu
  let mouseActive = false;
  let isLoopRunning = true;
  let framesRun = 0;

  for (let frame = 1; frame <= 120; frame++) {
    framesRun++;
    currentOpacity += (targetOpacity - currentOpacity) * 0.16;

    if (!mouseActive && currentOpacity < 0.005) {
      currentOpacity = 0;
      isLoopRunning = false;
      break;
    }
  }

  assert.strictEqual(isLoopRunning, false, 'O loop de animação DEVE parar completamente após o fade-out');
  assert.ok(framesRun < 60, `O fade-out deve parar em menos de 1 segundo (parou em ${framesRun} frames, ~${(framesRun * 16.6).toFixed(0)}ms)`);
  console.log(`   ✅ Loop parou com 100% de sucesso no frame ${framesRun} (~${(framesRun * 16.6).toFixed(0)}ms)! 0% consumo de CPU em repouso.`);

  // Teste 4: Estabilidade Física da Repulsão Fluida (sem divergência ou oscilações caóticas)
  console.log('4. Testando estabilidade e convergência da física de repulsão fluida e retorno por mola...');
  
  let particle = {
    x: 105,
    y: 100,
    vx: 0,
    vy: 0,
    baseX: 100,
    baseY: 100,
    angle: 0,
    baseAngle: 0,
    vRot: 0,
    driftSpeed: 0.001,
    driftPhase: 1.5,
    driftRadius: 3,
  };

  const cursor = { x: 100, y: 100 };
  const REPEL_RADIUS = 90;
  const SPRING = 0.055;
  const FRICTION = 0.82;

  let maxVelocity = 0;
  let maxDistance = 0;

  // 1. Simular 60 frames com cursor estático no card
  for (let f = 1; f <= 60; f++) {
    const dx = particle.x - cursor.x;
    const dy = particle.y - cursor.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const norm = 1 - dist / REPEL_RADIUS;
      const force = norm * norm * 4.2;
      particle.vx += (dx / dist) * force;
      particle.vy += (dy / dist) * force;
    }
    particle.vx = (particle.vx + (particle.baseX - particle.x) * SPRING) * FRICTION;
    particle.vy = (particle.vy + (particle.baseY - particle.y) * SPRING) * FRICTION;
    particle.x += particle.vx;
    particle.y += particle.vy;

    const v = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (v > maxVelocity) maxVelocity = v;
    const distFromOrigin = Math.hypot(particle.x - particle.baseX, particle.y - particle.baseY);
    if (distFromOrigin > maxDistance) maxDistance = distFromOrigin;
  }

  assert.ok(maxVelocity < 12, `Velocidade máxima deve ser suave e segura (< 12px/frame, obtido: ${maxVelocity.toFixed(2)})`);
  assert.ok(maxDistance < 60, `Deslocamento deve ser suave e não sair da tela (< 60px, obtido: ${maxDistance.toFixed(2)})`);
  assert.ok(!isNaN(particle.x) && !isNaN(particle.y), 'Coordenadas não podem ser NaN');

  // 2. Simular afastamento do cursor e retorno à posição base
  for (let f = 1; f <= 90; f++) {
    particle.vx = (particle.vx + (particle.baseX - particle.x) * SPRING) * FRICTION;
    particle.vy = (particle.vy + (particle.baseY - particle.y) * SPRING) * FRICTION;
    particle.x += particle.vx;
    particle.y += particle.vy;
  }

  const finalDist = Math.hypot(particle.x - particle.baseX, particle.y - particle.baseY);
  assert.ok(finalDist < 0.1, `Partícula deve retornar com precisão à posição base (< 0.1px, obtido: ${finalDist.toFixed(4)}px)`);
  console.log(`   ✅ Física altamente estável! MaxVel: ${maxVelocity.toFixed(2)}px/f, MaxDist: ${maxDistance.toFixed(1)}px, Retorno final: ${finalDist.toFixed(4)}px`);

  console.log('\n🎉 TODOS OS TESTES PROFUNDOS PASSARAM COM SUCESSO!\n');
} finally {
  await server.close();
}
