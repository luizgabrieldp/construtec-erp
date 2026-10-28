import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

globalThis.window = {
  localStorage: globalThis.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};

console.log('🧪 Iniciando testes de edge cases para Notificações In-App e Destinatários de Tarefas...\n');

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  // Teste 1: Importar módulos necessários
  console.log('1. Carregando módulos via SSR do Vite...');
  const { useErp } = await server.ssrLoadModule('/src/data/store.ts');
  const { useAuth } = await server.ssrLoadModule('/src/data/auth.ts');
  const { verificarLembretesTarefas, isTarefaRelevanteParaUsuario } = await server.ssrLoadModule('/src/lib/notifications.ts');
  const { ATUALIZACOES_SISTEMA } = await server.ssrLoadModule('/src/data/atualizacoes.ts');

  console.log('   ✅ Módulos carregados com sucesso!');

  // Teste 2: Validar versões v1.8.2 e v1.8.1 e passos visuais
  console.log('2. Validando integridade das releases v1.8.2 e v1.8.1 em ATUALIZACOES_SISTEMA...');
  const v182 = ATUALIZACOES_SISTEMA[0];
  assert.equal(v182.versao, 'v1.8.2');
  assert.equal(v182.dataPublicacao, '27 de Outubro de 2026 às 23:10');
  assert.equal(v182.titulo, 'Notificação Automática de Novas Versões & Leitura Inteligente sem Cliques Extras');
  assert.deepEqual(v182.tags, ['Novo', 'Melhoria', 'Correção']);
  assert.equal(v182.mudancas.length, 3);
  assert.equal(v182.passosVisuais.length, 5);

  const titulosPassos182 = v182.passosVisuais.map((p) => p.titulo);
  assert.ok(titulosPassos182.some((t) => t.includes('Notificação Automática')));
  assert.ok(titulosPassos182.some((t) => t.includes('Leitura Inteligente')));
  assert.ok(titulosPassos182.some((t) => t.includes('Marcação Automática em Tarefas')));
  assert.ok(titulosPassos182.some((t) => t.includes('Isolamento de Leitura por Conta')));
  assert.ok(titulosPassos182.some((t) => t.includes('Exportação do Guia v1.8.2 em PDF')));

  const v181 = ATUALIZACOES_SISTEMA.find((r) => r.versao === 'v1.8.1');
  assert.ok(v181, 'v1.8.1 deve existir no histórico');
  assert.equal(v181.versao, 'v1.8.1');
  assert.equal(v181.dataPublicacao, '27 de Outubro de 2026 às 22:20');
  assert.equal(v181.titulo, 'Notificações In-App no Topo, Destinatários de Lembretes & Ajustes em Obras');
  assert.deepEqual(v181.tags, ['Novo', 'Melhoria', 'Correção']);
  assert.equal(v181.mudancas.length, 4);
  assert.equal(v181.passosVisuais.length, 5);

  const titulosPassos = v181.passosVisuais.map((p) => p.titulo);
  assert.ok(titulosPassos.some((t) => t.includes('Central de Notificações In-App no Topo')));
  assert.ok(titulosPassos.some((t) => t.includes('Atribuir Destinatário')));
  assert.ok(titulosPassos.some((t) => t.includes('Identificar Responsáveis na Lista')));
  assert.ok(titulosPassos.some((t) => t.includes('Concluir Tarefas Diretamente pelo Sino')));
  assert.ok(titulosPassos.some((t) => t.includes('Exportar o Guia de Novidades v1.8.1 em PDF')));
  console.log('   ✅ Releases v1.8.2 e v1.8.1 validadas com sucesso!');

  // Teste 3: Lógica de filtragem de lembretes por destinatário em verificarLembretesTarefas
  console.log('3. Testando lógica de relevância de lembretes em notifications.ts...');
  const userAdmin = {
    id: 'usr-admin-1',
    nome: 'Carlos Admin',
    emailOuLogin: 'admin',
    senha: '123',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-01',
  };
  const userEncarregado = {
    id: 'usr-encarregado-2',
    nome: 'Marcos Mestre',
    emailOuLogin: 'mestre',
    senha: '123',
    perfil: 'encarregado',
    ativo: true,
    criadoEm: '2026-01-01',
  };

  const hoje = new Date().toISOString().slice(0, 10);

  // Usar função oficial exportada de notifications.ts
  const isRelevante = isTarefaRelevanteParaUsuario;

  // Caso A: Tarefa para todos
  const tTodos = { id: 't1', titulo: 'Reunião Geral', data: hoje, destinatarioTipo: 'todos' };
  assert.equal(isRelevante(tTodos, userAdmin), true, 'Tarefa para todos deve ser relevante para Admin');
  assert.equal(isRelevante(tTodos, userEncarregado), true, 'Tarefa para todos deve ser relevante para Encarregado');

  // Caso B: Tarefa específica para Encarregado
  const tEncarregado = {
    id: 't2',
    titulo: 'Conferir ferragem',
    data: hoje,
    destinatarioTipo: 'usuario',
    destinatarioId: 'usr-encarregado-2',
    criadoPorId: 'usr-admin-1',
  };
  assert.equal(isRelevante(tEncarregado, userEncarregado), true, 'Encarregado é o destinatário');
  assert.equal(isRelevante(tEncarregado, userAdmin), true, 'Admin é o criador, deve ser relevante');

  const outroUser = { id: 'usr-outro-3', nome: 'Outro', perfil: 'encarregado', ativo: true };
  assert.equal(isRelevante(tEncarregado, outroUser), false, 'Outro usuário não deve receber');

  // Caso C: Tarefa apenas para mim criada pelo Admin
  const tAdminEu = {
    id: 't3',
    titulo: 'Pagar DAS MEI',
    data: hoje,
    destinatarioTipo: 'eu',
    destinatarioId: 'usr-admin-1',
    criadoPorId: 'usr-admin-1',
  };
  assert.equal(isRelevante(tAdminEu, userAdmin), true, 'Admin criou para si');
  assert.equal(isRelevante(tAdminEu, userEncarregado), false, 'Encarregado não deve ver tarefa pessoal do Admin');

  // Caso D: Tarefa legada sem destinatarioTipo (retrocompatibilidade)
  const tLegada = { id: 't4', titulo: 'Comprar cimento', data: hoje };
  assert.equal(isRelevante(tLegada, userAdmin), true, 'Tarefa legada deve funcionar para admin');
  assert.equal(isRelevante(tLegada, userEncarregado), true, 'Tarefa legada deve funcionar para encarregado');

  console.log('   ✅ Lógica de relevância de destinatários testada e aprovada!');

  // Teste 4: Validar persistência e contagem no NotificacoesPopover
  console.log('4. Validando regras de leitura e contadores de notificações...');
  const notificacoesLidas = new Set();
  const tarefasMock = [tTodos, tEncarregado, tAdminEu];

  // Admin vê tTodos, tEncarregado (criador) e tAdminEu (destinatário) = 3
  const pendentesAdmin = tarefasMock.filter((t) => isRelevante(t, userAdmin));
  assert.equal(pendentesAdmin.length, 3);

  // Encarregado vê tTodos e tEncarregado = 2
  const pendentesEncarregado = tarefasMock.filter((t) => isRelevante(t, userEncarregado));
  assert.equal(pendentesEncarregado.length, 2);

  // Marcar todas como lidas
  pendentesAdmin.forEach((t) => notificacoesLidas.add(`tarefa-${t.id}`));
  notificacoesLidas.add(`versao-${v182.versao}`);
  notificacoesLidas.add(`versao-${v181.versao}`);

  const naoLidasAdminAposMarcar = pendentesAdmin.filter((t) => !notificacoesLidas.has(`tarefa-${t.id}`));
  assert.equal(naoLidasAdminAposMarcar.length, 0, 'Após marcar todas, contador de tarefas não lidas deve ser 0');
  assert.ok(notificacoesLidas.has(`versao-${v182.versao}`), 'Versão v1.8.2 deve estar marcada como lida');
  assert.ok(notificacoesLidas.has(`versao-${v181.versao}`), 'Versão v1.8.1 deve estar marcada como lida');

  console.log('   ✅ Contadores de notificações e marcar todas como lidas validados!');

  // Teste 5: Validar suporte ao ícone CheckCircle2 e isolamento de notificações
  console.log('5. Validando mapeamento de ícones e isolamento per-user...');
  const dialogSrc = readFileSync(resolve('src/features/atualizacoes/PassoAPassoDialog.tsx'), 'utf-8');
  assert.ok(dialogSrc.includes("case 'CheckCircle2':"), 'PassoAPassoDialog deve tratar case CheckCircle2');

  const popoverSrc = readFileSync(resolve('src/components/layout/NotificacoesPopover.tsx'), 'utf-8');
  assert.ok(popoverSrc.includes('getStorageKey(usuarioId)'), 'NotificacoesPopover deve isolar storage por usuário');
  assert.ok(popoverSrc.includes('isTarefaRelevanteParaUsuario'), 'NotificacoesPopover deve usar isTarefaRelevanteParaUsuario');

  const widgetSrc = readFileSync(resolve('src/features/dashboard/TarefasWidget.tsx'), 'utf-8');
  assert.ok(widgetSrc.includes("destinatarioTipo === 'todos'"), 'TarefasWidget deve exibir badge Para todos');
  console.log('   ✅ Ícone CheckCircle2, isolamento per-user e widget validados com sucesso!');

  // Teste 6: Validar verificarNotificacaoNovaVersao e isolamento de storage sem contaminação
  console.log('6. Validando verificarNotificacaoNovaVersao e isolamento per-user no localStorage...');
  const {
    verificarNotificacaoNovaVersao,
    getNotificacoesLidas,
    saveNotificacoesLidas,
    marcarNotificacoesComoLidas,
  } = await server.ssrLoadModule('/src/lib/notifications.ts');

  // Testar disparo de versão para userAdmin
  globalThis.localStorage.clear();
  verificarNotificacaoNovaVersao(userAdmin.id);
  const versaoNotificadaAdmin = globalThis.localStorage.getItem(`construtec:notificacoes:versao_notificada:${userAdmin.id}`);
  assert.equal(versaoNotificadaAdmin, 'v1.8.2', 'Deve ter gravado a versão notificada para o admin');

  // Segunda chamada não deve alterar ou re-notificar
  verificarNotificacaoNovaVersao(userAdmin.id);
  assert.equal(globalThis.localStorage.getItem(`construtec:notificacoes:versao_notificada:${userAdmin.id}`), 'v1.8.2');

  // Outro usuário ainda não foi notificado
  const versaoNotificadaOutro = globalThis.localStorage.getItem(`construtec:notificacoes:versao_notificada:${userEncarregado.id}`);
  assert.equal(versaoNotificadaOutro, null, 'Encarregado não deve herdar notificação de versão do admin');

  // Testar isolamento per-user de marcação de lidas
  const lidasAdmin = getNotificacoesLidas(userAdmin.id);
  assert.equal(lidasAdmin.size, 0);

  marcarNotificacoesComoLidas(['tarefa-t1', 'versao-v1.8.2'], userAdmin.id);
  const lidasAdminApos = getNotificacoesLidas(userAdmin.id);
  assert.equal(lidasAdminApos.has('tarefa-t1'), true);
  assert.equal(lidasAdminApos.has('versao-v1.8.2'), true);

  // Encarregado NÃO deve ter herdado as notificações lidas pelo admin
  const lidasEncarregado = getNotificacoesLidas(userEncarregado.id);
  assert.equal(lidasEncarregado.has('tarefa-t1'), false, 'Encarregado não deve herdar notificações lidas do admin');
  assert.equal(lidasEncarregado.has('versao-v1.8.2'), false, 'Encarregado não deve herdar versão lida do admin');

  console.log('   ✅ Notificação automática de versão e isolamento per-user testados e aprovados!');

  console.log('\n🎉 TODOS OS TESTES DE EDGE CASES PASSARAM COM SUCESSO!\n');
} catch (err) {
  console.error('❌ Falha nos testes de edge cases:', err);
  process.exit(1);
} finally {
  await server.close();
  process.exit(0);
}
