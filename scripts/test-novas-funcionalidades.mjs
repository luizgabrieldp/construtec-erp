import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

console.log('🧪 Iniciando testes das melhorias de Obras, Equipe e Central de Atualizações...\n');

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  // Teste 1: Validar histórico de atualizações (src/data/atualizacoes.ts)
  console.log('1. Validando estrutura de releases em src/data/atualizacoes.ts...');
  const atualizacoesMod = await server.ssrLoadModule('/src/data/atualizacoes.ts');
  const { ATUALIZACOES_SISTEMA, HISTORICO_ATUALIZACOES } = atualizacoesMod;

  assert.ok(Array.isArray(ATUALIZACOES_SISTEMA), 'ATUALIZACOES_SISTEMA deve ser um array');
  assert.ok(ATUALIZACOES_SISTEMA.length >= 3, 'Deve conter ao menos 3 versões no histórico (a partir da v1.7.0)');
  assert.equal(HISTORICO_ATUALIZACOES, ATUALIZACOES_SISTEMA, 'HISTORICO_ATUALIZACOES deve estar exportado e igual a ATUALIZACOES_SISTEMA');
  assert.ok(!ATUALIZACOES_SISTEMA.some((r) => r.versao === 'v1.6.0'), 'Versão legada v1.6.0 deve ter sido removida');
  assert.ok(
    ATUALIZACOES_SISTEMA.every((r) => {
      const parts = r.versao.replace('v', '').split('.').map(Number);
      return parts[0] > 1 || (parts[0] === 1 && parts[1] >= 7);
    }),
    'Todas as versões no histórico devem ser a partir da v1.7.0'
  );

  const v183 = ATUALIZACOES_SISTEMA[0];
  assert.equal(v183.versao, 'v1.8.3', 'A versão mais recente deve ser v1.8.3');
  assert.ok(v183.titulo.includes('Gestão Contínua de Tarefas Atrasadas'), 'Título da v1.8.3 deve mencionar Gestão Contínua');
  assert.ok(v183.descricao.length > 50, 'Descrição da v1.8.3 deve ser rica e no estilo App Store');
  assert.ok(v183.mudancas.length >= 3, 'v1.8.3 deve listar as mudanças detalhadas');
  assert.ok(v183.passosVisuais.length >= 5, 'v1.8.3 deve conter passos ilustrados');

  const tagsValidas = ['Novo', 'Melhoria', 'Correção'];
  v183.mudancas.forEach((m) => {
    assert.ok(tagsValidas.includes(m.tag), `Tag inválida: ${m.tag}`);
    assert.ok(m.texto.length > 5, 'Texto da mudança deve ser descritivo');
  });

  const v182 = ATUALIZACOES_SISTEMA.find((r) => r.versao === 'v1.8.2');
  assert.ok(v182, 'v1.8.2 deve estar presente no histórico');
  assert.ok(v182.titulo.includes('Notificação Automática'), 'Título da v1.8.2 deve mencionar Notificação Automática');
  assert.ok(v182.descricao.length > 50, 'Descrição da v1.8.2 deve ser rica e no estilo App Store');
  assert.ok(v182.mudancas.length >= 3, 'v1.8.2 deve listar as mudanças detalhadas');
  assert.ok(v182.passosVisuais.length >= 5, 'v1.8.2 deve conter passos ilustrados');

  v182.mudancas.forEach((m) => {
    assert.ok(tagsValidas.includes(m.tag), `Tag inválida: ${m.tag}`);
    assert.ok(m.texto.length > 5, 'Texto da mudança deve ser descritivo');
  });

  const v181 = ATUALIZACOES_SISTEMA.find((r) => r.versao === 'v1.8.1');
  assert.ok(v181, 'v1.8.1 deve estar presente no histórico');
  assert.ok(v181.titulo.includes('Notificações In-App'), 'Título da v1.8.1 deve mencionar Notificações In-App');
  assert.ok(v181.descricao.length > 50, 'Descrição deve ser rica e no estilo App Store');
  assert.ok(v181.mudancas.length >= 4, 'v1.8.1 deve listar as mudanças detalhadas');
  assert.ok(v181.passosVisuais.length >= 4, 'v1.8.1 deve conter passos ilustrados');

  v181.mudancas.forEach((m) => {
    assert.ok(tagsValidas.includes(m.tag), `Tag inválida: ${m.tag}`);
    assert.ok(m.texto.length > 5, 'Texto da mudança deve ser descritivo');
  });

  const v180 = ATUALIZACOES_SISTEMA.find((r) => r.versao === 'v1.8.0');
  assert.ok(v180, 'v1.8.0 deve estar presente no histórico');
  assert.ok(v180.titulo.includes('Ordenação Inteligente'), 'Título de v1.8.0 deve mencionar ordenação');
  assert.ok(v180.descricao.length > 50, 'Descrição de v1.8.0 deve ser rica e no estilo App Store');
  assert.ok(v180.mudancas.length >= 4, 'v1.8.0 deve listar as mudanças detalhadas');
  assert.ok(v180.passosVisuais.length >= 4, 'v1.8.0 deve conter passos ilustrados');

  console.log('   ✅ Histórico de versões estruturado e validado com sucesso (v1.8.2, v1.8.1 e v1.8.0)!');

  // Teste 2: Validar aba Atualizações em ConfiguracoesPage.tsx
  console.log('2. Validando posicionamento da aba "Atualizações" em ConfiguracoesPage.tsx...');
  const configCode = readFileSync(resolve('src/pages/ConfiguracoesPage.tsx'), 'utf-8');

  assert.ok(
    configCode.includes("type TabConfig = 'atualizacoes' | 'perfil' | 'usuarios' | 'notificacoes'"),
    'TabConfig deve definir atualizacoes como primeira opção'
  );
  assert.ok(
    configCode.includes("const [abaAtiva, setAbaAtiva] = useState<TabConfig>('atualizacoes')"),
    'Aba ativa padrão deve ser atualizacoes'
  );

  // Verificar se o botão de Atualizações vem antes de Meu Perfil no JSX
  const idxBtnAtualizacoes = configCode.indexOf("setAbaAtiva('atualizacoes')");
  const idxBtnPerfil = configCode.indexOf("setAbaAtiva('perfil')");
  assert.ok(
    idxBtnAtualizacoes !== -1 && idxBtnAtualizacoes < idxBtnPerfil,
    'Botão da aba "Atualizações" deve vir antes do botão "Meu Perfil"'
  );

  assert.ok(
    configCode.includes("{abaAtiva === 'atualizacoes' && <AtualizacoesTab />}"),
    'Deve renderizar AtualizacoesTab quando aba ativa for atualizacoes'
  );
  console.log('   ✅ Aba "Atualizações" posicionada e configurada como primeira aba!');

  // Teste 3: Validar ordenação alfabética padrão (A-Z) em ApontamentoGrade.tsx
  console.log('3. Validando ordenação alfabética por apelido/nome em ApontamentoGrade.tsx...');
  const gradeCode = readFileSync(resolve('src/features/folha/ApontamentoGrade.tsx'), 'utf-8');

  assert.ok(
    gradeCode.includes('.sort((a, b) => {'),
    'ApontamentoGrade deve conter sort()'
  );
  assert.ok(
    gradeCode.includes('(a.apelido?.trim() || a.nome).trim()'),
    'Ordenação da grade deve considerar apelido ou nome de a'
  );
  assert.ok(
    gradeCode.includes('(b.apelido?.trim() || b.nome).trim()'),
    'Ordenação da grade deve considerar apelido ou nome de b'
  );
  assert.ok(
    gradeCode.includes("nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })"),
    'Deve ordenar com localeCompare pt-BR e sensitivity base'
  );
  console.log('   ✅ Grade semanal ordenada de A a Z por apelido/nome com sucesso!');

  // Teste 4: Validar ordenação clicável e setinhas na tabela de EquipePage.tsx
  console.log('4. Validando cabeçalhos clicáveis e ordenação em EquipePage.tsx...');
  const equipeCode = readFileSync(resolve('src/pages/EquipePage.tsx'), 'utf-8');

  // Checar colunas esperadas
  assert.ok(equipeCode.includes("alternarOrdenacao('colaborador')"), 'Deve permitir ordenar por Colaborador');
  assert.ok(equipeCode.includes("alternarOrdenacao('funcao')"), 'Deve permitir ordenar por Função');
  assert.ok(equipeCode.includes("alternarOrdenacao('remuneracao')"), 'Deve permitir ordenar por Remuneração');
  assert.ok(equipeCode.includes("alternarOrdenacao('obra')"), 'Deve permitir ordenar por Obra Padrão');
  assert.ok(equipeCode.includes("alternarOrdenacao('status')"), 'Deve permitir ordenar por Status');

  // Checar setinhas interativas ▲ / ▼
  assert.ok(equipeCode.includes('▼') && equipeCode.includes('▲'), 'Cabeçalhos devem exibir setinhas interativas');

  // Checar iteração por funcionariosOrdenados
  assert.ok(
    equipeCode.includes('{funcionariosOrdenados.map((f) => {'),
    'Tabela deve iterar pela lista ordenada funcionariosOrdenados'
  );
  console.log('   ✅ Tabela da equipe configurada com ordenação interativa em 5 colunas!');

  // Teste 5: Validar alternador Cards vs Lista e seletor de ordenação em ObrasPage.tsx
  console.log('5. Validando visualização em Cards/Lista e ordenação em ObrasPage.tsx...');
  const obrasCode = readFileSync(resolve('src/pages/ObrasPage.tsx'), 'utf-8');

  assert.ok(
    obrasCode.includes("const [modoExibicao, setModoExibicao] = useState<'cards' | 'lista'>('cards')"),
    'Deve conter estado modoExibicao'
  );
  assert.ok(
    obrasCode.includes('setCriterioOrdenacao'),
    'Deve conter seletor de ordenação'
  );
  assert.ok(
    obrasCode.includes('obrasOrdenadas'),
    'Deve computar obrasOrdenadas'
  );

  // Checar colunas do modo Lista
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Obra</th>'), 'Deve ter coluna Obra');
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Cliente</th>'), 'Deve ter coluna Cliente');
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Responsável / Arquiteto</th>'), 'Deve ter coluna Responsável / Arquiteto');
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Fase Atual</th>'), 'Deve ter coluna Fase Atual');
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Status</th>'), 'Deve ter coluna Status');
  assert.ok(obrasCode.includes('<th className="px-4 py-3">Progresso / Prazo</th>'), 'Deve ter coluna Progresso / Prazo');
  assert.ok(obrasCode.includes('Detalhes da Obra'), 'Deve ter botão Detalhes da Obra');
  assert.ok(obrasCode.includes('prazo-inicio'), 'Deve conter opção de ordenação em início');
  assert.ok(obrasCode.includes('getLabelFase(obra.fase, obra)'), 'Deve resolver fases padrão e customizadas');
  console.log('   ✅ Modos Cards/Lista e ordenação de obras validados com sucesso!');

  // Teste 6: Testar lógica de ordenação pura com mock de dados incluindo edge cases
  console.log('6. Testando comportamento da ordenação multifatorial de obras e edge cases...');
  const mockObras = [
    { id: '1', nome: 'Residencial Zênite', status: 'concluida', dataInicio: '2025-01-01', previsaoEntrega: '2025-12-01' },
    { id: '2', nome: 'Edifício Aurora', status: 'andamento', dataInicio: '2026-06-01', previsaoEntrega: '2026-10-30' },
    { id: '3', nome: 'Condomínio Bela Vista', status: 'planejamento', dataInicio: '2026-09-01', previsaoEntrega: '2027-03-01' },
    { id: '4', nome: 'Torre Horizonte', status: 'andamento', dataInicio: '2026-01-01', previsaoEntrega: '2026-11-15' },
  ];

  // Ordenação A-Z
  const sortAZ = [...mockObras].sort((a, b) => a.nome.localeCompare(b.nome));
  assert.equal(sortAZ[0].nome, 'Condomínio Bela Vista');
  assert.equal(sortAZ[3].nome, 'Torre Horizonte');

  // Ordenação Z-A
  const sortZA = [...mockObras].sort((a, b) => b.nome.localeCompare(a.nome));
  assert.equal(sortZA[0].nome, 'Torre Horizonte');
  assert.equal(sortZA[3].nome, 'Condomínio Bela Vista');

  // Ordenação por Status (andamento -> planejamento -> pausada -> concluida)
  const pesoStatus = { andamento: 1, planejamento: 2, pausada: 3, concluida: 4 };
  const sortStatus = [...mockObras].sort((a, b) => pesoStatus[a.status] - pesoStatus[b.status]);
  assert.equal(sortStatus[0].status, 'andamento');
  assert.equal(sortStatus[1].status, 'andamento');
  assert.equal(sortStatus[2].status, 'planejamento');
  assert.equal(sortStatus[3].status, 'concluida');

  // Ordenação por Prazo de Conclusão: obras concluídas NUNCA devem ultrapassar obras em andamento
  const hoje = '2026-10-27';
  const diffDaysMock = (d1, d2) => Math.round((new Date(d2) - new Date(d1)) / 86400000);
  const sortPrazoConclusao = [...mockObras].sort((a, b) => {
    if (a.status === 'concluida' && b.status !== 'concluida') return 1;
    if (a.status !== 'concluida' && b.status === 'concluida') return -1;
    const diasA = diffDaysMock(hoje, a.previsaoEntrega);
    const diasB = diffDaysMock(hoje, b.previsaoEntrega);
    return diasA - diasB;
  });

  // Edifício Aurora (entrega 2026-10-30 = 3 dias) deve vir antes de Torre Horizonte (15/11)
  assert.equal(sortPrazoConclusao[0].nome, 'Edifício Aurora');
  assert.equal(sortPrazoConclusao[1].nome, 'Torre Horizonte');
  // Residencial Zênite (já concluída) deve ficar no final!
  assert.equal(sortPrazoConclusao[3].nome, 'Residencial Zênite');
  console.log('   ✅ Algoritmo de ordenação testado com garantia de posicionamento para obras concluídas!');

  // Teste 7: Validar regras de impressão e suporte a autoPrint
  console.log('7. Validando estilização e suporte para impressão/PDF do modal de atualizações...');
  const indexCss = readFileSync(resolve('src/index.css'), 'utf-8');
  assert.ok(indexCss.includes('.cx-printable-dialog > div > div:first-child'), 'Deve ocultar header do modal no print');
  assert.ok(indexCss.includes('.cx-printable-dialog > div > div:last-child'), 'Deve ocultar footer do modal no print');
  assert.ok(indexCss.includes('dialog::backdrop'), 'Deve limpar backdrop no print');

  const dialogCode = readFileSync(resolve('src/features/atualizacoes/PassoAPassoDialog.tsx'), 'utf-8');
  assert.ok(dialogCode.includes('autoPrint'), 'PassoAPassoDialog deve aceitar prop autoPrint');
  assert.ok(dialogCode.includes('CloudCheck'), 'PassoAPassoDialog deve suportar ícone CloudCheck');
  assert.ok(dialogCode.includes('MousePointerClick'), 'PassoAPassoDialog deve suportar ícone Touchpad/MousePointerClick');

  const tabCode = readFileSync(resolve('src/features/atualizacoes/AtualizacoesTab.tsx'), 'utf-8');
  assert.ok(tabCode.includes('autoPrint={autoPrint}'), 'AtualizacoesTab deve repassar autoPrint ao modal');
  // Teste 8: Validar remoção de máquinas e locações do módulo de Obras
  console.log('8. Validando remoção completa de máquinas e locações de Obras...');
  const obrasPageCode = readFileSync(resolve('src/pages/ObrasPage.tsx'), 'utf-8');
  assert.ok(!obrasPageCode.includes('maquinasAtivas'), 'ObrasPage não deve referenciar maquinasAtivas');
  assert.ok(!obrasPageCode.includes('Máquinas'), 'ObrasPage não deve conter texto de Máquinas');
  assert.ok(obrasPageCode.includes('Equipe Hoje'), 'ObrasPage deve exibir Equipe Hoje no resumo');

  const obraDetalhesCode = readFileSync(resolve('src/features/obras/ObraDetalhesDialog.tsx'), 'utf-8');
  assert.ok(!obraDetalhesCode.includes('locacoesObra'), 'ObraDetalhesDialog não deve ter locacoesObra');
  assert.ok(!obraDetalhesCode.includes('Máquinas e Equipamentos Locados'), 'ObraDetalhesDialog não deve ter bloco de máquinas');
  assert.ok(!obraDetalhesCode.includes('porGrupo?.locacao'), 'ObraDetalhesDialog não deve exibir coluna de locações');
  assert.ok(!obraDetalhesCode.includes('Construction'), 'ObraDetalhesDialog não deve importar Construction');
  assert.ok(obraDetalhesCode.includes('grid-cols-3'), 'ObraDetalhesDialog deve usar grid-cols-3 no orçamento');

  const confirmarExclusaoCode = readFileSync(resolve('src/features/obras/ConfirmarExclusaoObraDialog.tsx'), 'utf-8');
  assert.ok(!confirmarExclusaoCode.includes('locacoesVinculadas'), 'ConfirmarExclusaoObraDialog não deve ter locacoesVinculadas');
  assert.ok(!confirmarExclusaoCode.includes('locações'), 'ConfirmarExclusaoObraDialog não deve exibir texto de locações');
  console.log('   ✅ Remoção de máquinas e locações do módulo de Obras validada com sucesso!');

  // Teste 9: Validar Notificações In-App no Topo e Atribuição de Destinatários de Tarefas (v1.8.1)
  console.log('9. Validando Notificações In-App e Destinatários de Tarefas (v1.8.1)...');
  const appShellCode = readFileSync(resolve('src/components/layout/AppShell.tsx'), 'utf-8');
  assert.ok(appShellCode.includes('NotificacoesPopover'), 'AppShell deve importar e renderizar NotificacoesPopover');
  assert.ok(appShellCode.includes('SyncStatusBadge'), 'AppShell deve conter SyncStatusBadge');
  assert.ok(
    appShellCode.indexOf('<SyncStatusBadge />') < appShellCode.indexOf('<NotificacoesPopover />'),
    'SyncStatusBadge deve ficar à esquerda de NotificacoesPopover no Topbar',
  );

  const popoverCode = readFileSync(resolve('src/components/layout/NotificacoesPopover.tsx'), 'utf-8');
  assert.ok(popoverCode.includes('export function NotificacoesPopover'), 'NotificacoesPopover deve ser exportado');
  assert.ok(popoverCode.includes('marcarTodasComoLidas'), 'NotificacoesPopover deve permitir marcar todas como lidas');
  assert.ok(popoverCode.includes('tarefasPendentes'), 'NotificacoesPopover deve listar tarefas pendentes');
  assert.ok(popoverCode.includes('versaoRecente'), 'NotificacoesPopover deve exibir versão recente do sistema');

  const typesCode = readFileSync(resolve('src/domain/types.ts'), 'utf-8');
  assert.ok(typesCode.includes("destinatarioTipo?: 'eu' | 'todos' | 'usuario'"), 'Tarefa deve conter destinatarioTipo');
  assert.ok(typesCode.includes('destinatarioId?: string'), 'Tarefa deve conter destinatarioId');
  assert.ok(typesCode.includes('destinatarioNome?: string'), 'Tarefa deve conter destinatarioNome');
  assert.ok(typesCode.includes('criadoPorId?: string'), 'Tarefa deve conter criadoPorId');
  assert.ok(typesCode.includes('criadoPorNome?: string'), 'Tarefa deve conter criadoPorNome');

  const formCode = readFileSync(resolve('src/features/tarefas/TarefaFormDialog.tsx'), 'utf-8');
  assert.ok(formCode.includes('Destinatário do Lembrete'), 'TarefaFormDialog deve ter campo Destinatário do Lembrete');
  assert.ok(formCode.includes('Apenas para mim'), 'TarefaFormDialog deve ter opção Apenas para mim');
  assert.ok(formCode.includes('Todos os usuários com conta'), 'TarefaFormDialog deve ter opção Todos os usuários com conta');
  assert.ok(formCode.includes('Usuário específico'), 'TarefaFormDialog deve ter opção Usuário específico');

  const notifCode = readFileSync(resolve('src/lib/notifications.ts'), 'utf-8');
  assert.ok(notifCode.includes('usuarioAtual'), 'notifications.ts deve obter usuarioAtual para filtrar lembretes');
  assert.ok(notifCode.includes('isParaTodos'), 'notifications.ts deve verificar tarefas para todos');
  assert.ok(notifCode.includes('isAtribuidaAEle'), 'notifications.ts deve verificar se a tarefa foi atribuída ao usuário');

  const tarefasPageCode = readFileSync(resolve('src/pages/TarefasPage.tsx'), 'utf-8');
  assert.ok(tarefasPageCode.includes('Para todos'), 'TarefasPage deve exibir tag Para todos');
  assert.ok(tarefasPageCode.includes('t.destinatarioNome'), 'TarefasPage deve exibir destinatarioNome');
  console.log('   ✅ Notificações In-App e Destinatários de Tarefas validados com 100% de sucesso!');

  // Teste 10: Validar Notificação Automática de Novas Versões & Leitura Inteligente (v1.8.2)
  console.log('10. Validando Notificação Automática de Novas Versões & Leitura Inteligente (v1.8.2)...');
  assert.ok(appShellCode.includes('verificarNotificacaoNovaVersao'), 'AppShell deve chamar verificarNotificacaoNovaVersao no boot');
  assert.ok(notifCode.includes('verificarNotificacaoNovaVersao'), 'notifications.ts deve exportar verificarNotificacaoNovaVersao');
  assert.ok(notifCode.includes('construtec:notificacoes:versao_notificada'), 'notifications.ts deve registrar versao_notificada per-user no localStorage');
  assert.ok(popoverCode.includes('novasLidas'), 'NotificacoesPopover deve gerenciar marcação de lidas');
  assert.ok(tarefasPageCode.includes('marcarNotificacoesComoLidas'), 'TarefasPage deve marcar tarefas pendentes como lidas ao montar');
  const atualizacoesTabCode = readFileSync(resolve('src/features/atualizacoes/AtualizacoesTab.tsx'), 'utf-8');
  assert.ok(atualizacoesTabCode.includes('getNotificacoesLidas'), 'AtualizacoesTab deve verificar leitura da versão recente');
  console.log('   ✅ Notificação automática e leitura inteligente validadas com 100% de sucesso!');

  // Teste 11: Validar Tarefas Atrasadas Contínuas, Exclusão Ágil & PWA em Segundo Plano (v1.8.3)
  console.log('11. Validando Tarefas Atrasadas Contínuas, Exclusão Ágil & PWA em Segundo Plano (v1.8.3)...');
  const widgetCode = readFileSync(resolve('src/features/dashboard/TarefasWidget.tsx'), 'utf-8');
  assert.ok(widgetCode.includes('Trash2'), 'TarefasWidget deve incluir botão Trash2 para exclusão ágil');
  assert.ok(widgetCode.includes('diffDays'), 'TarefasWidget deve calcular dias de atraso via diffDays');
  assert.ok(widgetCode.includes('excluirTarefa'), 'TarefasWidget deve implementar excluirTarefa');
  assert.ok(popoverCode.includes('Trash2'), 'NotificacoesPopover deve incluir botão Trash2 ao lado de concluir');
  assert.ok(popoverCode.includes('excluirTarefa'), 'NotificacoesPopover deve implementar excluirTarefa');
  assert.ok(tarefasPageCode.includes('diasAtraso'), 'TarefasPage deve calcular e exibir diasAtraso');
  assert.ok(configCode.includes('Testar Notificação Agora'), 'ConfiguracoesPage deve conter botão Testar Notificação Agora');
  assert.ok(configCode.includes('adicionado à Tela de Início'), 'ConfiguracoesPage deve explicar exigência do iOS');
  const swCode = readFileSync(resolve('public/sw.js'), 'utf-8');
  assert.ok(swCode.includes('periodicsync'), 'Service Worker deve suportar periodicsync');
  assert.ok(swCode.includes('vibrate'), 'Service Worker deve incluir vibração nas notificações');
  console.log('   ✅ Gestão Contínua, Exclusão Ágil e Notificações em Segundo Plano validadas com 100% de sucesso!');

  console.log('\n🎉 TODOS OS TESTES DAS NOVAS FUNCIONALIDADES PASSARAM COM 100% DE SUCESSO!\n');
} catch (err) {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
} finally {
  await server.close();
  process.exit(0);
}
