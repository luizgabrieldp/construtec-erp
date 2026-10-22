import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

const windowListeners = new Map();
const docListeners = new Map();
globalThis.window = {
  localStorage: globalThis.localStorage,
  addEventListener: (ev, fn) => {
    if (!windowListeners.has(ev)) windowListeners.set(ev, new Set());
    windowListeners.get(ev).add(fn);
  },
  removeEventListener: (ev, fn) => {
    windowListeners.get(ev)?.delete(fn);
  },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
globalThis.document = {
  visibilityState: 'visible',
  documentElement: { classList: { toggle: () => {}, add: () => {}, remove: () => {} } },
  addEventListener: (ev, fn) => {
    if (!docListeners.has(ev)) docListeners.set(ev, new Set());
    docListeners.get(ev).add(fn);
  },
  removeEventListener: (ev, fn) => {
    docListeners.get(ev)?.delete(fn);
  },
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const syncMod = await server.ssrLoadModule('/src/data/sync.ts');
  const mockMod = await server.ssrLoadModule('/src/domain/mock.ts');

  const {
    obterMaiorTimestampConhecido,
    registrarMutacaoErp,
    mesclarDadosErp,
    normalizarDadosErp,
    fingerprintDominio,
  } = syncMod;
  const { dadosVazios } = mockMod;

  console.log('1. Testando obterMaiorTimestampConhecido com entradas vazias/nulas e populadas...');
  assert.equal(obterMaiorTimestampConhecido(null), 0);
  assert.equal(obterMaiorTimestampConhecido(undefined), 0);
  assert.equal(obterMaiorTimestampConhecido(dadosVazios()), 0);

  const estadoComMetadados = dadosVazios();
  estadoComMetadados._meta = {
    updatedAt: { 'obras:o1': 1500, 'tarefas:t1': 3200 },
    deletedIds: { 'compras:c1': 4800 },
    systemResetAt: 2000,
    lastWriteAt: 4100,
  };
  assert.equal(obterMaiorTimestampConhecido(estadoComMetadados), 4800);

  console.log('2. Testando cenário Allysson: 2 iPhones e 1 iPad simultâneos (mesmo login) com Clock Skew severo...');
  // Dispositivo 1: iPhone 1 de Allysson (relógio adiantado em +60s: t = 1_060_000)
  // Dispositivo 2: iPhone 2 de Allysson (relógio normal: t = 1_000_000 -> 60s atrasado em relação ao iPhone 1)
  // Dispositivo 3: iPad de Allysson (relógio atrasado em -30s: t = 970_000 -> 90s atrasado em relação ao iPhone 1)
  const base = normalizarDadosErp(dadosVazios());

  // Passo A: No iPhone 1 (t = 1_060_000), Allysson cria a Obra 'obr-1' e a Tarefa 'tar-1'
  const draftIphone1 = structuredClone(base);
  draftIphone1.obras.push({
    id: 'obr-1',
    nome: 'Residencial Alpha (iPhone 1)',
    cliente: 'Cliente A',
    endereco: 'Rua 1',
    status: 'em_andamento',
    orcamento: 100000,
    dataInicio: '2026-10-01',
  });
  draftIphone1.tarefas.push({
    id: 'tar-1',
    titulo: 'Conferir fundação',
    concluida: false,
    prioridade: 'alta',
    criadoEm: '2026-10-22',
  });
  const estadoIphone1 = registrarMutacaoErp(base, draftIphone1, 'cli_iphone_1', 1_060_000);
  assert.equal(estadoIphone1._meta.updatedAt['obras:obr-1'], 1_060_000);
  assert.equal(estadoIphone1._meta.updatedAt['tarefas:tar-1'], 1_060_000);
  assert.equal(obterMaiorTimestampConhecido(estadoIphone1), 1_060_000);

  // Passo B: O iPhone 2 de Allysson recebe o estado da nuvem (vindo do iPhone 1) e, em seguida,
  // Allysson edita a MESMA Obra 'obr-1' e conclui a MESMA Tarefa 'tar-1' no iPhone 2,
  // cujo relógio físico está atrasado (t = 1_000_000 < 1_060_000).
  const recebidoNoIphone2 = mesclarDadosErp(dadosVazios(), estadoIphone1);
  const draftIphone2 = structuredClone(recebidoNoIphone2);
  draftIphone2.obras[0].nome = 'Residencial Alpha - Editado no iPhone 2';
  draftIphone2.obras[0].orcamento = 150000;
  draftIphone2.tarefas[0].concluida = true;
  draftIphone2.config.empresa = 'CONSTRUTEC ALLYSSON & LUIZ';

  const estadoIphone2 = registrarMutacaoErp(
    recebidoNoIphone2,
    draftIphone2,
    'cli_iphone_2',
    1_000_000, // Relógio físico atrasado!
  );

  // O Relógio Lógico Monotônico deve garantir timestamp 1_060_001 (> 1_060_000)
  assert.equal(estadoIphone2._meta.updatedAt['obras:obr-1'], 1_060_001);
  assert.equal(estadoIphone2._meta.updatedAt['tarefas:tar-1'], 1_060_001);
  assert.equal(estadoIphone2._meta.updatedAt['config'], 1_060_001);

  // Mesclando iPhone 1 + iPhone 2 em qualquer ordem, a edição do iPhone 2 vence sem perder dados
  const merge12 = mesclarDadosErp(estadoIphone1, estadoIphone2);
  const merge21 = mesclarDadosErp(estadoIphone2, estadoIphone1);
  assert.equal(fingerprintDominio(merge12), fingerprintDominio(merge21));
  assert.equal(merge12.obras[0].nome, 'Residencial Alpha - Editado no iPhone 2');
  assert.equal(merge12.obras[0].orcamento, 150000);
  assert.equal(merge12.tarefas[0].concluida, true);
  assert.equal(merge12.config.empresa, 'CONSTRUTEC ALLYSSON & LUIZ');

  // Passo C: O iPad de Allysson (relógio ainda mais atrasado: t = 970_000) recebe o estado sincronizado,
  // edita novamente a MESMA Obra 'obr-1', adiciona um Funcionário 'func-1' e exclui a Tarefa 'tar-1'.
  const recebidoNoIpad = mesclarDadosErp(dadosVazios(), merge12);
  const draftIpad = structuredClone(recebidoNoIpad);
  draftIpad.obras[0].nome = 'Residencial Alpha - Revisão Final no iPad';
  draftIpad.obras[0].orcamento = 185000;
  draftIpad.tarefas = []; // Exclui tar-1 no iPad
  draftIpad.funcionarios.push({
    id: 'func-1',
    nome: 'Carlos Pedreiro',
    funcao: 'Pedreiro',
    diaria: 180,
    ativo: true,
  });

  const estadoIpad = registrarMutacaoErp(
    recebidoNoIpad,
    draftIpad,
    'cli_ipad_allysson',
    970_000, // Relógio 90s atrasado!
  );

  assert.equal(estadoIpad._meta.updatedAt['obras:obr-1'], 1_060_002);
  assert.equal(estadoIpad._meta.deletedIds['tarefas:tar-1'], 1_060_002);
  assert.equal(estadoIpad._meta.updatedAt['funcionarios:func-1'], 1_060_002);

  // Mesclando o estado do iPad com iPhone 1 e iPhone 2 em todas as permutações possíveis
  const finalA = mesclarDadosErp(mesclarDadosErp(estadoIphone1, estadoIphone2), estadoIpad);
  const finalB = mesclarDadosErp(estadoIpad, mesclarDadosErp(estadoIphone2, estadoIphone1));
  assert.equal(fingerprintDominio(finalA), fingerprintDominio(finalB));
  assert.equal(finalA.obras.length, 1);
  assert.equal(finalA.obras[0].nome, 'Residencial Alpha - Revisão Final no iPad');
  assert.equal(finalA.obras[0].orcamento, 185000);
  assert.equal(finalA.tarefas.length, 0); // Exclusão feita no iPad prevaleceu apesar do relógio atrasado!
  assert.equal(finalA.funcionarios.length, 1);
  assert.equal(finalA.funcionarios[0].nome, 'Carlos Pedreiro');

  console.log('3. Testando preservaçao de timestamp=1 na geração automática de recorrências...');
  const draftRec = structuredClone(finalA);
  draftRec.contasPagar.push({
    id: 'cp-rec-1',
    descricao: 'Aluguel Galpão',
    categoria: 'Outros',
    valor: 2500,
    vencimento: '2026-10-10',
    status: 'pendente',
    origem: 'recorrencia',
    origemId: 'rec-1',
  });
  const aposRec = registrarMutacaoErp(finalA, draftRec, 'cli_ipad_allysson', 1);
  assert.equal(aposRec._meta.updatedAt['contasPagar:cp-rec-1'], 1);
  // E o lastWriteAt não regrediu para 1!
  assert.equal(aposRec._meta.lastWriteAt, 1_060_002);

  console.log('4. Testando Auth (obterMaiorTimestampAuth, mesclarUsuarios, mesclarConvites) com Clock Skew entre 2 iPhones e 1 iPad...');
  const authMod = await server.ssrLoadModule('/src/data/auth.ts');
  const { obterMaiorTimestampAuth, mesclarUsuarios, mesclarConvites } = authMod;

  const usrIphone1 = {
    id: 'usr-admin',
    nome: 'Allysson (iPhone 1)',
    emailOuLogin: 'allysson',
    senha: '123',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: 2_000_000, // Relógio adiantado no iPhone 1
  };
  const conviteIphone1 = {
    id: 'inv-1',
    codigo: 'ADM-111111',
    perfil: 'admin',
    usado: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: 2_050_000,
  };

  const maiorTsAuth = obterMaiorTimestampAuth([usrIphone1], [conviteIphone1], usrIphone1);
  assert.equal(maiorTsAuth, 2_050_000);

  // iPad com relógio atrasado (1_900_000) calcula timestamp monotônico:
  const tsMonotonicoIpad = Math.max(1_900_000, maiorTsAuth + 1);
  assert.equal(tsMonotonicoIpad, 2_050_001);

  const usrIpad = {
    ...usrIphone1,
    nome: 'Allysson (Editado no iPad)',
    senha: '456',
    atualizadoEm: tsMonotonicoIpad,
  };

  const usuariosMescladosAB = mesclarUsuarios([usrIphone1], [usrIpad], usrIphone1);
  const usuariosMescladosBA = mesclarUsuarios([usrIpad], [usrIphone1], usrIphone1);
  const adminAB = usuariosMescladosAB.find((u) => u.id === 'usr-admin');
  const adminBA = usuariosMescladosBA.find((u) => u.id === 'usr-admin');
  assert.equal(adminAB.nome, 'Allysson (Editado no iPad)');
  assert.equal(adminAB.senha, '456');
  assert.equal(adminBA.nome, 'Allysson (Editado no iPad)');
  assert.equal(adminBA.senha, '456');

  const conviteUsadoIphone2 = {
    ...conviteIphone1,
    usado: true,
    usadoPor: 'Luiz Gabriel',
    atualizadoEm: Math.max(1_950_000, tsMonotonicoIpad + 1),
  };
  const convitesMesclados = mesclarConvites([conviteIphone1], [conviteUsadoIphone2]);
  const conv = convitesMesclados.find((c) => c.codigo === 'ADM-111111');
  assert.equal(conv.usado, true);
  assert.equal(conv.usadoPor, 'Luiz Gabriel');
  assert.equal(conv.atualizadoEm, 2_050_002);

  // Testando ações reais do useAuth com relógio no futuro no estado
  const { useAuth } = authMod;
  const tsFuturo = Date.now() + 500_000;
  useAuth.setState({
    usuarioAtual: { ...usrIphone1, atualizadoEm: tsFuturo },
    usuarios: [{ ...usrIphone1, atualizadoEm: tsFuturo }],
    convites: [],
  });
  useAuth.getState().atualizarPerfil({ nome: 'Allysson Monotônico' });
  assert.equal(useAuth.getState().usuarioAtual.nome, 'Allysson Monotônico');
  assert.equal(useAuth.getState().usuarioAtual.atualizadoEm, tsFuturo + 1);

  const novoConvite = useAuth.getState().criarConvite('encarregado');
  assert.equal(novoConvite.atualizadoEm, tsFuturo + 2);

  const resCad = useAuth.getState().cadastrarComConvite(novoConvite.codigo, {
    nome: 'Mestre João',
    emailOuLogin: 'joao.obra',
    senha: '789',
  });
  assert.equal(resCad.ok, true);
  assert.equal(useAuth.getState().usuarioAtual.atualizadoEm, tsFuturo + 3);

  useAuth.getState().alternarStatusUsuario('usr-admin');
  const adminAlternado = useAuth.getState().usuarios.find((u) => u.id === 'usr-admin');
  assert.equal(adminAlternado.ativo, false);
  assert.equal(adminAlternado.atualizadoEm, tsFuturo + 4);

  console.log('5. Testando Store (restaurarDemo e zerarSistema monotônicos) e Repository (listeners focus e pageshow)...');
  const storeMod = await server.ssrLoadModule('/src/data/store.ts');
  const { useErp } = storeMod;

  // Confirma que repository.subscribe registrou 'online', 'focus', 'pageshow' em window e 'visibilitychange' em document
  assert.equal(windowListeners.get('online')?.size > 0, true);
  assert.equal(windowListeners.get('focus')?.size > 0, true);
  assert.equal(windowListeners.get('pageshow')?.size > 0, true);
  assert.equal(docListeners.get('visibilitychange')?.size > 0, true);

  // Força um timestamp alto no estado do useErp e verifica que restaurarDemo e zerarSistema avançam monotonicamente
  const tsErpFuturo = Date.now() + 900_000;
  const estadoFuturo = dadosVazios();
  estadoFuturo._meta = {
    updatedAt: { config: tsErpFuturo },
    deletedIds: {},
    lastWriteAt: tsErpFuturo,
  };
  useErp.setState({ data: estadoFuturo });

  useErp.getState().restaurarDemo();
  assert.equal(useErp.getState().data._meta.lastWriteAt, tsErpFuturo + 1);

  useErp.getState().zerarSistema();
  assert.equal(useErp.getState().data._meta.systemResetAt, tsErpFuturo + 2);
  assert.equal(useErp.getState().data._meta.lastWriteAt, tsErpFuturo + 2);

  console.log('✅ Todos os testes de sincronização multi-dispositivo e Relógio Lógico Monotônico passaram!');
} catch (err) {
  console.error('❌ Erro no teste:', err);
  process.exitCode = 1;
} finally {
  await server.close();
  process.exit(process.exitCode || 0);
}
