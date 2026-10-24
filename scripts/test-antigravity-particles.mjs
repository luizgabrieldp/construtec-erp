import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

console.log('🧪 Iniciando testes profundos do AntigravityParticlesCanvas...\n');

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

  // Validar presença do Canvas
  assert.ok(markupCard.includes('<canvas '), 'StatCard deve conter o elemento <canvas>');
  assert.ok(markupCard.includes('z-0'), 'Canvas deve estar na camada z-0');

  // Validar ausência do pontinho único antigo
  assert.ok(
    !markupCard.includes('size-2 rounded-full blur-[0.5px]'),
    'Não deve conter o antigo pontinho único estático size-2'
  );

  // Validar que o conteúdo (texto, label, valor) está na camada z-10
  assert.ok(
    markupCard.includes('relative z-10 flex flex-col justify-between h-full'),
    'Conteúdo do card deve estar na camada frontal z-10'
  );

  console.log('   ✅ StatCard integrado perfeitamente com canvas em z-0 e conteúdo em z-10!');

  console.log('\n🎉 TODOS OS TESTES DE PARTÍCULAS ANTIGRAVITY PASSARAM COM SUCESSO!\n');
} finally {
  await server.close();
}
