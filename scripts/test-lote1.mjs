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
  key: (idx) => Array.from(storageMap.keys())[idx] ?? null,
  get length() {
    return storageMap.size;
  },
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
  const cryptoMod = await server.ssrLoadModule('/src/lib/crypto.ts');
  const formatMod = await server.ssrLoadModule('/src/lib/format.ts');
  const datesMod = await server.ssrLoadModule('/src/lib/dates.ts');
  const navMod = await server.ssrLoadModule('/src/app/nav.ts');
  const engineMod = await server.ssrLoadModule('/src/domain/engine.ts');
  const printMod = await server.ssrLoadModule('/src/lib/print.ts');
  const uiMod = await server.ssrLoadModule('/src/data/ui.ts');
  const authMod = await server.ssrLoadModule('/src/data/auth.ts');
  const storeMod = await server.ssrLoadModule('/src/data/store.ts');
  const mockMod = await server.ssrLoadModule('/src/domain/mock.ts');
  const selectorsMod = await server.ssrLoadModule('/src/domain/selectors.ts');

  const { hashPassword, verifyPassword, gerarCodigoSeguro, escapeHtml, sanitizeCsvCell } = cryptoMod;
  const { parseMoedaBR } = formatMod;
  const { isValidISODate, eachDay } = datesMod;
  const { podeAcessar, NAV } = navMod;
  const {
    valorDia,
    calcularFolha,
    verificarSobreposicaoFechamento,
    proximaDataRecorrente,
    gerarProximaTarefaRecorrente,
  } = engineMod;
  const { eventosCusto } = selectorsMod;
  const { gerarHtmlRecibosIndividuais, gerarHtmlReciboEmpreiteiro } = printMod;
  const { useUi } = uiMod;
  const { useAuth } = authMod;
  const { useErp } = storeMod;
  const { dadosVazios } = mockMod;

  console.log('1. Testando crypto.ts (PBKDF2, códigos seguros, escapeHtml, sanitizeCsvCell)...');
  const h1 = await hashPassword('SenhaForte!2026');
  const h2 = await hashPassword('SenhaForte!2026');
  assert.ok(h1.startsWith('pbkdf2$100000$'));
  assert.notEqual(h1, h2, 'Salts aleatórios devem produzir hashes distintos');
  assert.deepEqual(await verifyPassword('SenhaForte!2026', h1), { valid: true, needsMigration: false });
  assert.deepEqual(await verifyPassword('SenhaErrada', h1), { valid: false, needsMigration: false });
  assert.deepEqual(await verifyPassword('x', 'pbkdf2$10$invalido$zz'), { valid: false, needsMigration: false });
  assert.deepEqual(await verifyPassword('legado123', 'legado123'), { valid: true, needsMigration: true });
  assert.deepEqual(await verifyPassword('outra', 'legado123'), { valid: false, needsMigration: false });

  const cod1 = gerarCodigoSeguro('OBR-', 8);
  const cod2 = gerarCodigoSeguro('OBR-', 8);
  assert.match(cod1, /^OBR-[A-Z2-9]{8}$/);
  assert.notEqual(cod1, cod2);

  assert.equal(escapeHtml('<script>alert("xss")</script> & \'test\''), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(123), '123');

  assert.equal(sanitizeCsvCell('=CMD|"/C calc"!A0'), '"\'=CMD|""/C calc""!A0"');
  assert.equal(sanitizeCsvCell('+1+1'), '"\'+1+1"');
  assert.equal(sanitizeCsvCell('-500'), '"\'-500"');
  assert.equal(sanitizeCsvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"');
  assert.equal(sanitizeCsvCell('\tcmd'), '"\'\tcmd"');
  assert.equal(sanitizeCsvCell('  =1+1'), '"\'  =1+1"');
  assert.equal(sanitizeCsvCell('João "Construtor"'), '"João ""Construtor"""');

  console.log('2. Testando format.ts (parseMoedaBR) & dates.ts (isValidISODate, eachDay)...');
  assert.equal(parseMoedaBR('R$ 1.250,50'), 1250.5);
  assert.equal(parseMoedaBR('1250.50'), 1250.5);
  assert.equal(parseMoedaBR('1.500'), 1500);
  assert.equal(parseMoedaBR('1250,75'), 1250.75);
  assert.equal(parseMoedaBR('-350,25'), -350.25);
  assert.equal(parseMoedaBR(''), 0);
  assert.equal(parseMoedaBR('abc'), 0);
  assert.equal(parseMoedaBR(42.9), 42.9);

  assert.equal(isValidISODate('2026-02-28'), true);
  assert.equal(isValidISODate('2026-02-31'), false);
  assert.equal(isValidISODate('2024-02-29'), true);
  assert.equal(isValidISODate('2025-02-29'), false);
  assert.equal(isValidISODate('invalida'), false);

  assert.deepEqual(eachDay('2026-02-31', '2026-03-05'), []);
  assert.deepEqual(eachDay('2026-03-10', '2026-03-05'), []);
  assert.deepEqual(eachDay('2026-03-01', '2026-03-03'), ['2026-03-01', '2026-03-02', '2026-03-03']);
  // Limite de 1500 dias para evitar loop infinito
  assert.equal(eachDay('2020-01-01', '2030-01-01').length, 1500);

  console.log('3. Testando nav.ts (default-deny RBAC e atalhos 1..6)...');
  assert.deepEqual(
    NAV.map((n) => [n.key, n.to]),
    [
      ['1', '/'],
      ['2', '/obras'],
      ['3', '/equipe'],
      ['4', '/folha'],
      ['5', '/tarefas'],
      ['6', '/configuracoes'],
    ],
  );
  assert.equal(podeAcessar('/relatorio-tecnico', 'admin'), false);
  assert.equal(podeAcessar('/rota-inexistente', 'admin'), false);
  assert.equal(podeAcessar('/folha', 'encarregado'), false);
  assert.equal(podeAcessar('/configuracoes', 'encarregado'), true);
  assert.equal(podeAcessar('/folha', 'admin'), true);
  assert.equal(podeAcessar('/obras', 'encarregado'), true);
  assert.equal(podeAcessar('/login', 'encarregado'), true);
  assert.equal(podeAcessar('/cadastro', 'encarregado'), true);

  console.log('4. Testando engine.ts (valorDia, calcularFolha personalizado/range inválido, sobreposição e recorrência)...');
  const mensalista = {
    id: 'f1',
    nome: 'Carlos',
    funcao: 'Mestre',
    regime: 'mensalista',
    diaria: 0,
    salario: 3000,
    telefone: '',
    pix: '',
    ativo: true,
    obraPadraoId: 'obr-1',
    admissao: '2026-01-01',
  };
  assert.equal(valorDia(mensalista), 100);
  const diarista = { ...mensalista, id: 'f2', regime: 'diarista', diaria: 180, salario: 0 };
  assert.equal(valorDia(diarista), 180);

  // Período personalizado de 45 dias (sem teto artificial de 30 dias!) e 3 faltas => (3000/30)*(45-3) = 4200
  const apont45 = {
    'f1|2026-01-05': { id: 'af1', data: '2026-01-05', funcionarioId: 'f1', centroId: 'obr-1', status: 'falta' },
    'f1|2026-01-06': { id: 'af2', data: '2026-01-06', funcionarioId: 'f1', centroId: 'obr-1', status: 'falta' },
    'f1|2026-01-07': { id: 'af3', data: '2026-01-07', funcionarioId: 'f1', centroId: 'obr-1', status: 'falta' },
  };
  const folha45 = calcularFolha(
    mensalista,
    '2026-01-01',
    '2026-02-14', // 45 dias inclusivos
    apont45,
    [],
    'personalizado',
  );
  assert.equal(folha45.valorBase, 4200);
  assert.equal(folha45.total, 4200);

  // Range invertido/inválido deve zerar tudo
  const folhaInvalida = calcularFolha(mensalista, '2026-03-10', '2026-03-01', {}, [], 'personalizado');
  assert.equal(folhaInvalida.diasTrabalhados, 0);
  assert.equal(folhaInvalida.valorBase, 0);
  assert.equal(folhaInvalida.total, 0);

  // Deduplicação de centroIds repetidos no apontamento
  const apontDedup = {
    'f2|2026-03-02': { id: 'a1', data: '2026-03-02', funcionarioId: 'f2', centroId: 'obr-1', centroIds: ['obr-1', 'obr-1'], status: 'inteiro' },
  };
  const folhaDedup = calcularFolha(diarista, '2026-03-01', '2026-03-05', apontDedup, [], 'semanal');
  assert.equal(folhaDedup.diasTrabalhados, 1);
  assert.equal(folhaDedup.valorBase, 180);
  assert.equal(folhaDedup.porCentroDias['obr-1'], 1);

  // Sobreposição de fechamentos (deve ignorar status aberto e detectar apenas fechado)
  const fechamentos = [
    { id: 'fech-1', funcionarioId: 'f1', inicio: '2026-03-01', fim: '2026-03-15', status: 'fechado' },
    { id: 'fech-aberto', funcionarioId: 'f1', inicio: '2026-03-16', fim: '2026-03-31', status: 'aberto' },
  ];
  assert.ok(verificarSobreposicaoFechamento(fechamentos, 'f1', '2026-03-01', '2026-03-15'));
  assert.ok(verificarSobreposicaoFechamento(fechamentos, 'f1', '2026-03-10', '2026-03-20'));
  assert.ok(verificarSobreposicaoFechamento(fechamentos, 'f1', '2026-02-20', '2026-03-01'));
  assert.equal(verificarSobreposicaoFechamento(fechamentos, 'f1', '2026-03-16', '2026-03-31'), undefined);
  assert.equal(verificarSobreposicaoFechamento(fechamentos, 'f1', '2026-03-01', '2026-03-15', 'fech-1'), undefined);

  // Deduplicação em custosMaoDeObra (via eventosCusto) quando centroIds tem duplicatas e sem dupla contagem
  const dadosMaoDeObra = {
    ...dadosVazios(),
    funcionarios: [diarista],
    apontamentos: apontDedup,
  };
  const moEvents = eventosCusto(dadosMaoDeObra, '2026-03-05').filter((e) => e.grupo === 'mao_de_obra');
  assert.equal(moEvents.length, 1);
  assert.equal(moEvents[0].centroId, 'obr-1');
  assert.equal(moEvents[0].valor, 180);

  // sanitizeCsvCell com whitespace inicial (\n, \t)
  assert.equal(sanitizeCsvCell('\n=CMD()'), `"\'\n=CMD()"`);
  assert.equal(sanitizeCsvCell('   +SUM(A1)'), `"\'   +SUM(A1)"`);

  // Recorrência de tarefas
  assert.equal(proximaDataRecorrente('2026-03-06', 'diaria'), '2026-03-07'); // sexta -> sábado
  assert.equal(proximaDataRecorrente('2026-03-06', 'dias_uteis'), '2026-03-09'); // sexta -> segunda (pula sáb/dom)
  assert.equal(proximaDataRecorrente('2026-03-06', 'semanal'), '2026-03-13');
  assert.equal(proximaDataRecorrente('2026-03-06', 'quinzenal'), '2026-03-21');
  assert.equal(proximaDataRecorrente('2026-01-31', 'mensal'), '2026-02-28');
  assert.equal(proximaDataRecorrente('2026-03-06', 'nenhuma'), null);

  const tarefaRec = {
    id: 'tar-1',
    titulo: 'Inspeção de EPI',
    obraId: 'obr-1',
    data: '2026-03-06',
    prioridade: 'alta',
    concluida: true,
    recorrencia: 'dias_uteis',
    criadoEm: '2026-03-01T10:00:00.000Z',
  };
  const prox = gerarProximaTarefaRecorrente(tarefaRec, [tarefaRec], 'tar-2');
  assert.ok(prox);
  assert.equal(prox.id, 'tar-2');
  assert.equal(prox.data, '2026-03-09');
  assert.equal(prox.concluida, false);
  assert.equal(prox.origemRecorrenciaId, 'tar-1');
  // Evita duplicação caso já exista aberta para a mesma data
  const duplicada = gerarProximaTarefaRecorrente(tarefaRec, [tarefaRec, prox], 'tar-3');
  assert.equal(duplicada, null);

  console.log('5. Testando print.ts (XSS escaping e empresa dinâmica)...');
  const htmlInd = gerarHtmlRecibosIndividuais(
    [
      {
        id: 'rec-xss-1',
        funcionarioNome: '<img src=x onerror=alert(1)>',
        funcionarioFuncao: '<script>evil()</script>',
        funcionarioRegime: 'diarista',
        funcionarioTelefone: '87999990000',
        obrasNomes: ['Obra <svg onload=alert(2)>'],
        tipo: 'semanal',
        inicio: '2026-03-01',
        fim: '2026-03-07',
        diasTrabalhados: 5,
        valorBase: 900,
        ajustes: [{ descricao: 'Bônus <b>XSS</b>', valor: 100 }],
        total: 1000,
      },
    ],
    {
      nomeFantasia: 'Construtora Alpha <script>',
      razaoSocial: 'Alpha Engenharia LTDA',
      cnpj: '11.222.333/0001-44',
      cidadeUf: 'Juazeiro/BA',
      telefone: '(74) 99999-0000',
    },
  );
  assert.ok(!htmlInd.includes('<script>'));
  assert.ok(!htmlInd.includes('<img src=x'));
  assert.ok(!htmlInd.includes('<svg onload'));
  assert.ok(!htmlInd.includes('35.477.198/0001-83'), 'Não deve conter CNPJ fixo legado');
  assert.ok(htmlInd.includes('11.222.333/0001-44'));
  assert.ok(htmlInd.includes('Alpha Engenharia LTDA'));
  assert.ok(htmlInd.includes('Juazeiro/BA'));
  assert.ok(htmlInd.includes('&lt;img src=x onerror=alert(1)&gt;'));

  const htmlEmp = gerarHtmlReciboEmpreiteiro(
    {
      empreiteiroNome: 'Mestre <script>alert(9)</script>',
      tipo: 'semanal',
      inicio: '2026-03-01',
      fim: '2026-03-07',
      itens: [{ nome: 'Zé <iframe>', funcao: 'Servente', diasTrabalhados: 3, diaria: 120, total: 360 }],
      totalGeral: 360,
    },
    { nome: 'Construtora Beta', cnpj: '', cidade: 'Recife/PE' },
  );
  assert.ok(!htmlEmp.includes('<script>'));
  assert.ok(!htmlEmp.includes('<iframe>'));
  assert.ok(htmlEmp.includes('Construtora Beta'));
  assert.ok(htmlEmp.includes('Recife/PE'));

  console.log('6. Testando segurança de UI/Auth/Store (perfil padrão, PBKDF2 auto-migração, RBAC, unicidade, isolamento pré-login e logout)...');
  assert.equal(useUi.getState().perfil, 'encarregado', 'useUi nunca deve assumir admin por padrão');

  // Garantir estado deslogado inicial não carregou dados sensíveis
  storageMap.set(
    'construtec:data',
    JSON.stringify({
      ...dadosVazios(),
      obras: [{ id: 'obr-sigilo', nome: 'Obra Confidencial', cliente: 'X', endereco: 'Y', status: 'em_andamento', orcamento: 1000, dataInicio: '2026-01-01' }],
    }),
  );
  assert.equal(useAuth.getState().usuarioAtual, null);
  assert.equal(useErp.getState().data.obras.length, 0, 'Sem sessão autenticada, store ERP não deve expor dados');

  // Seed controlado de usuário legado em texto puro + outro usuário
  const hashAdmin = await hashPassword('adminSegura123');
  useAuth.setState({
    usuarioAtual: null,
    usuarios: [
      {
        id: 'u-legacy',
        nome: 'Encarregado Legado',
        emailOuLogin: 'legado.obra',
        senha: '123',
        perfil: 'encarregado',
        ativo: true,
        criadoEm: '2026-01-01',
        atualizadoEm: 1000,
      },
      {
        id: 'u-admin',
        nome: 'Diretor Admin',
        emailOuLogin: 'admin',
        senha: hashAdmin,
        perfil: 'admin',
        ativo: true,
        criadoEm: '2026-01-01',
        atualizadoEm: 1000,
      },
    ],
    convites: [],
  });

  // Login com senha legada deve autenticar e migrar automaticamente para PBKDF2
  const resLeg = await useAuth.getState().login('legado.obra', '123');
  assert.equal(resLeg.ok, true);
  const userMigrado = useAuth.getState().usuarios.find((u) => u.id === 'u-legacy');
  assert.ok(userMigrado.senha.startsWith('pbkdf2$100000$'), 'Senha legada deve ser migrada para PBKDF2 no login');
  assert.equal((await verifyPassword('123', userMigrado.senha)).valid, true);

  // Encarregado NÃO pode criar convite nem alternar status
  const convNegado = useAuth.getState().criarConvite('admin');
  assert.equal(convNegado.ok, false);
  const altNegado = useAuth.getState().alternarStatusUsuario('u-admin');
  assert.equal(altNegado.ok, false);

  // Unicidade de login em atualizarPerfil (tentar assumir login 'ADMIN' case-insensitive deve falhar)
  const dupRes = await useAuth.getState().atualizarPerfil({ emailOuLogin: 'ADMIN' });
  assert.equal(dupRes.ok, false);

  // Após login, iniciarSyncErp carrega dados locais e permite mutação; logout limpa tudo
  assert.equal(useErp.getState().data.obras.length, 1);
  useErp.getState().mutate((d) => {
    d.obras.push({
      id: 'obr-mem',
      nome: 'Obra em Memória',
      cliente: 'C',
      endereco: 'E',
      status: 'em_andamento',
      orcamento: 5000,
      dataInicio: '2026-03-01',
    });
  });
  assert.equal(useErp.getState().data.obras.length, 2);

  useAuth.getState().logout();
  assert.equal(useAuth.getState().usuarioAtual, null);
  assert.equal(useErp.getState().data.obras.length, 0, 'Logout deve limpar estado ERP da memória');
  assert.equal(storageMap.has('construtec:data'), false, 'Logout deve limpar construtec:data do localStorage');
  assert.equal(storageMap.has('construtec:auth'), false, 'Logout deve limpar construtec:auth do localStorage');

  // Login com PBKDF2 válido de admin e emissão de convite seguro
  const resAdmin = await useAuth.getState().login('admin', 'adminSegura123');
  assert.equal(resAdmin.ok, true);
  const resConvAdmin = useAuth.getState().criarConvite('encarregado');
  assert.equal(resConvAdmin.ok, true);
  assert.match(resConvAdmin.convite.codigo, /^OBRA-[A-Z2-9]{6}$/);

  console.log('7. Verificando proteções PROD/DEV, CSP/Headers e Service Worker...');
  const authSrc = readFileSync(resolve('src/data/auth.ts'), 'utf-8');
  assert.ok(authSrc.includes('IS_PROD') && authSrc.includes('IS_DEV'));
  const loginSrc = readFileSync(resolve('src/pages/LoginPage.tsx'), 'utf-8');
  assert.ok(loginSrc.includes('import.meta.env.DEV'));
  const vercelJson = JSON.parse(readFileSync(resolve('vercel.json'), 'utf-8'));
  const vercelHeaderKeys = vercelJson.headers?.[0]?.headers?.map((h) => h.key) ?? [];
  for (const k of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
    assert.ok(vercelHeaderKeys.includes(k), `vercel.json deve definir ${k}`);
  }
  const firebaseJson = JSON.parse(readFileSync(resolve('firebase.json'), 'utf-8'));
  const fbHeaderKeys = firebaseJson.hosting?.headers?.[0]?.headers?.map((h) => h.key) ?? [];
  for (const k of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
    assert.ok(fbHeaderKeys.includes(k), `firebase.json deve definir ${k}`);
  }
  const swSrc = readFileSync(resolve('public/sw.js'), 'utf-8');
  assert.ok(!swSrc.includes('BACKGROUND_SYNC_TRIGGER'), 'sw.js não deve conter evento órfão BACKGROUND_SYNC_TRIGGER');
  assert.ok(swSrc.includes('parsed.origin !== self.location.origin'), 'sw.js deve validar mesma origem no notificationclick');
  assert.ok(swSrc.includes("self.addEventListener('fetch'"), 'sw.js deve possuir handler de fetch offline');

  console.log('\n🎉 TODOS OS TESTES DO LOTE 1 PASSARAM COM 100% DE SUCESSO!\n');
  await server.close();
  process.exit(0);
} catch (err) {
  console.error('❌ Falha nos testes do Lote 1:', err);
  await server.close();
  process.exit(1);
}
