import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

console.log('🧪 Iniciando testes profundos dos StatCards navegáveis...\n');

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const statCardMod = await server.ssrLoadModule('/src/components/ui/StatCard.tsx');
  const { StatCard } = statCardMod;

  // Teste 1: StatCard com propriedade `to` deve renderizar tag <a> semântica com href correto
  console.log('1. Testando renderização semântica de Link quando `to` é fornecido...');
  const markupLink = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StatCard, {
        label: 'Obras Ativas',
        value: 5,
        hint: '1 planej.',
        icon: React.createElement('svg'),
        to: '/obras',
        title: 'Ver obras ativas',
      })
    )
  );

  assert.ok(markupLink.startsWith('<a ') && markupLink.includes('href="/obras"'), `Esperado <a com href="/obras", obtido: ${markupLink.slice(0, 70)}`);
  assert.ok(markupLink.includes('title="Ver obras ativas"'), 'Deve conter o atributo title');
  assert.ok(markupLink.includes('cursor-pointer'), 'Deve conter classe cursor-pointer');
  assert.ok(markupLink.includes('active:scale-98'), 'Deve conter feedback tátil mobile active:scale-98');
  assert.ok(markupLink.includes('sm:active:scale-[0.99]'), 'Deve conter feedback tátil desktop sm:active:scale-[0.99]');
  assert.ok(markupLink.includes('hover:border-brand/40'), 'Deve conter hover suave de borda');
  assert.ok(markupLink.includes('hover:bg-surface-2/40'), 'Deve conter hover suave de fundo');
  assert.ok(markupLink.includes('aria-hidden="true"'), 'Ícone decorativo deve ter aria-hidden="true"');
  console.log('   ✅ Link semântico renderizado com classes interativas e acessibilidade!');

  // Teste 2: StatCard com `onClick` sem `to` deve renderizar <button type="button">
  console.log('2. Testando renderização de <button type="button"> quando apenas `onClick` é fornecido...');
  const markupButton = renderToStaticMarkup(
    React.createElement(StatCard, {
      label: 'Ação Rápida',
      value: 10,
      icon: React.createElement('svg'),
      onClick: () => {},
      title: 'Executar ação',
    })
  );

  assert.ok(markupButton.startsWith('<button type="button"'), `Esperado <button type="button", obtido: ${markupButton.slice(0, 50)}`);
  assert.ok(markupButton.includes('title="Executar ação"'), 'Deve conter title no botão');
  assert.ok(markupButton.includes('cursor-pointer'), 'Deve conter cursor-pointer');
  assert.ok(markupButton.includes('w-full'), 'Deve ter largura completa w-full');
  console.log('   ✅ Botão nativo renderizado corretamente!');

  // Teste 3: StatCard estático (sem `to` e sem `onClick`) deve renderizar <div> sem classes interativas
  console.log('3. Testando renderização estática quando não for clicável...');
  const markupStatic = renderToStaticMarkup(
    React.createElement(StatCard, {
      label: 'Métrica Informativa',
      value: '100%',
      icon: React.createElement('svg'),
    })
  );

  assert.ok(markupStatic.startsWith('<div class="rounded-2xl border border-line bg-surface p-3.5 sm:p-5"'), `Esperado <div ..., obtido: ${markupStatic.slice(0, 80)}`);
  assert.ok(!markupStatic.includes('cursor-pointer'), 'Não deve ter cursor-pointer quando estático');
  assert.ok(!markupStatic.includes('active:scale'), 'Não deve ter active:scale quando estático');
  console.log('   ✅ Card estático limpo sem classes interativas desnecessárias!');

  // Teste 4: Validar os 4 cards operacionais do DashboardPage.tsx
  console.log('4. Validando configuração dos 4 cards de métricas no DashboardPage.tsx...');
  const dashboardCode = readFileSync(resolve('src/pages/DashboardPage.tsx'), 'utf-8');

  // Regex para checar os 4 cards e suas respectivas rotas dentro de cada bloco <StatCard ... />
  const cardObrasAtivas = /<StatCard[\s\S]*?label="Obras Ativas"[\s\S]*?to="\/obras"[\s\S]*?\/>/.test(dashboardCode);
  const cardEmCampo = /<StatCard[\s\S]*?label="Em Campo"[\s\S]*?to="\/equipe"[\s\S]*?\/>/.test(dashboardCode);
  const cardFaltasHoje = /<StatCard[\s\S]*?label="Faltas Hoje"[\s\S]*?to="\/equipe"[\s\S]*?\/>/.test(dashboardCode);
  const cardPrazoMedio = /<StatCard[\s\S]*?label="Prazo Médio"[\s\S]*?to="\/obras"[\s\S]*?\/>/.test(dashboardCode);

  assert.ok(cardObrasAtivas, 'Card "Obras Ativas" deve navegar para "/obras"');
  assert.ok(cardEmCampo, 'Card "Em Campo" deve navegar para "/equipe"');
  assert.ok(cardFaltasHoje, 'Card "Faltas Hoje" deve navegar para "/equipe"');
  assert.ok(cardPrazoMedio, 'Card "Prazo Médio" deve navegar para "/obras"');
  console.log('   ✅ Todos os 4 cards operacionais apontam para as rotas corretas (/obras e /equipe)!');

  // Teste 5: Inspecionar o CSS gerado no build para validar classes Tailwind v4
  console.log('5. Validando bundle CSS compilado...');
  const distAssetsDir = resolve('dist/assets');
  const cssFiles = readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
  assert.ok(cssFiles.length > 0, 'Deve existir arquivo CSS compilado na pasta dist/assets');

  const cssContent = readFileSync(join(distAssetsDir, cssFiles[0]), 'utf-8');
  assert.ok(cssContent.includes('.active\\:scale-98:active'), 'CSS deve conter .active:scale-98:active');
  assert.ok(cssContent.includes('sm\\:active\\:scale-\\[0\\.99\\]:active'), 'CSS deve conter sm:active:scale-[0.99]:active');
  assert.ok(cssContent.includes('.hover\\:border-brand\\/40:hover'), 'CSS deve conter .hover:border-brand/40:hover');
  assert.ok(cssContent.includes('.hover\\:bg-surface-2\\/40:hover'), 'CSS deve conter .hover:bg-surface-2/40:hover');
  console.log('   ✅ Todas as classes Tailwind v4 foram geradas perfeitamente no bundle!');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!\n');
} finally {
  await server.close();
}
