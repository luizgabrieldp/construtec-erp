/**
 * Gerador de dados de demonstração da CONSTRUTEC.
 * Todas as datas são RELATIVAS a "hoje" para que o mock nunca fique desatualizado.
 * Usa PRNG com semente fixa → mesmo resultado a cada restauração (no mesmo dia).
 */
import type {
  Apontamento,
  AuditEntry,
  CentroId,
  Compra,
  CompraDestino,
  ContaPagar,
  ContaReceber,
  ErpData,
  FechamentoFolha,
  FormaPagamento,
  Fornecedor,
  Funcionario,
  ISODate,
  Locacao,
  Material,
  MovimentoEstoque,
  Obra,
  Recorrencia,
  CategoriaGasto,
  ServicoEmpreitada,
  EtapaServico,
  Tarefa,
} from './types';
import { SEDE } from './types';
import {
  calcularFolha,
  chaveApontamento,
  compraDistribuicao,
  compraTotal,
  custoLocacao,
  escalarDistribuicao,
  gerarContasRecorrentes,
  gerarParcelas,
} from './engine';
import { addDays, eachDay, endOfMonth, monthKey, startOfMonth, startOfWeek, today, weekday, addMonths } from '@/lib/dates';
import { fmtDate, round2 } from '@/lib/format';

export const DATA_VERSION = 3;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gerarDadosDemo(hoje: ISODate = today()): ErpData {
  const T = hoje;
  const d = (n: number) => addDays(T, n);
  const rnd = mulberry32(20261003);
  const agora = new Date().toISOString();
  let seq = 0;
  const id = (p: string) => `${p}_${(++seq).toString(36).padStart(4, '0')}`;

  // ------------------------------------------------------------ obras
  const obras: Obra[] = [
    {
      id: 'o_jardins',
      nome: 'Residencial Jardins',
      endereco: 'Rua das Acácias, 450 — Jardim Europa',
      responsavel: 'Eng. Ricardo Almeida',
      arquiteto: 'Arq. Mariana Vasconcelos',
      cliente: 'Jardins Incorporadora Ltda.',
      dataInicio: d(-120),
      previsaoEntrega: d(150),
      orcamento: 780_000,
      valorContrato: 1_020_000,
      status: 'andamento',
      fase: 'alvenaria',
      cor: '#FF6B00',
    },
    {
      id: 'o_galeria',
      nome: 'Reforma Comercial Galeria Central',
      endereco: 'Av. Central, 1200 — Centro',
      responsavel: 'Mestre Antônio Ferreira',
      arquiteto: 'Arq. Lucas Siqueira',
      cliente: 'Galeria Central Empreendimentos',
      dataInicio: d(-75),
      previsaoEntrega: d(45),
      orcamento: 240_000,
      valorContrato: 318_000,
      status: 'andamento',
      fase: 'acabamento',
      cor: '#38BDF8',
    },
    {
      id: 'o_vista',
      nome: 'Condomínio Vista Bela',
      endereco: 'Estrada do Mirante, km 3 — Vista Bela',
      responsavel: 'Eng.ª Juliana Costa',
      arquiteto: 'Arq. Camila Albuquerque',
      cliente: 'Vista Bela SPE Ltda.',
      dataInicio: d(-95),
      previsaoEntrega: d(260),
      orcamento: 1_350_000,
      valorContrato: 1_740_000,
      status: 'andamento',
      fase: 'fundacao',
      cor: '#A78BFA',
    },
  ];
  const obraAtiva = (oid: string, data: ISODate) => obras.find((o) => o.id === oid)!.dataInicio <= data;

  // ------------------------------------------------------------ fornecedores
  const fornecedores: Fornecedor[] = [
    { id: 'f_areal', nome: 'Areal São Jorge', categoria: 'areia_brita', cnpj: '12.345.678/0001-90', contato: 'Jorge Mendes', telefone: '(87) 99812-3344', cidade: 'Petrolina/PE' },
    { id: 'f_cimenteira', nome: 'Cimenteira Nordeste Distribuidora', categoria: 'cimento', cnpj: '23.456.789/0001-01', contato: 'Patrícia Lopes', telefone: '(87) 3861-4500', cidade: 'Petrolina/PE' },
    { id: 'f_acoforte', nome: 'Ferragens Aço Forte', categoria: 'ferragens', cnpj: '34.567.890/0001-12', contato: 'Cláudio Rocha', telefone: '(87) 99977-1020', cidade: 'Petrolina/PE' },
    { id: 'f_ceramica', nome: 'Cerâmica Santa Luzia', categoria: 'ceramica_tijolos', cnpj: '45.678.901/0001-23', contato: 'Fátima Araújo', telefone: '(87) 3862-8890', cidade: 'Petrolina/PE' },
    { id: 'f_pontocerto', nome: 'Ponto Certo Elétrica e Hidráulica', categoria: 'eletrica_hidraulica', cnpj: '56.789.012/0001-34', contato: 'Rafael Dantas', telefone: '(87) 99654-7788', cidade: 'Petrolina/PE' },
    { id: 'f_locamaq', nome: 'LocaMáquinas Pesadas Ltda.', categoria: 'locacao', cnpj: '67.890.123/0001-45', contato: 'Sérgio Queiroz', telefone: '(87) 3863-9090', cidade: 'Petrolina/PE' },
    { id: 'f_andaimes', nome: 'Andaimes & Cia Locações', categoria: 'locacao', cnpj: '78.901.234/0001-56', contato: 'Bruna Freitas', telefone: '(87) 99123-4567', cidade: 'Petrolina/PE' },
  ];

  // ------------------------------------------------------------ materiais
  const materiais: Material[] = [
    { id: 'm_tijolo', nome: 'Tijolo cerâmico 8 furos', unidade: 'un', categoria: 'ceramica_tijolos', estoqueMinimo: 500 },
    { id: 'm_bloco', nome: 'Bloco de concreto 14x19x39', unidade: 'un', categoria: 'ceramica_tijolos', estoqueMinimo: 300 },
    { id: 'm_cimento', nome: 'Cimento CP-II 50kg', unidade: 'saco', categoria: 'cimento', estoqueMinimo: 40 },
    { id: 'm_argamassa', nome: 'Argamassa AC-II 20kg', unidade: 'saco', categoria: 'cimento', estoqueMinimo: 20 },
    { id: 'm_cal', nome: 'Cal hidratada 20kg', unidade: 'saco', categoria: 'cimento', estoqueMinimo: 10 },
    { id: 'm_concreto', nome: 'Concreto usinado fck 30 MPa', unidade: 'm3', categoria: 'cimento', estoqueMinimo: 0 },
    { id: 'm_areia', nome: 'Areia média lavada', unidade: 'm3', categoria: 'areia_brita', estoqueMinimo: 5 },
    { id: 'm_brita', nome: 'Brita nº 1', unidade: 'm3', categoria: 'areia_brita', estoqueMinimo: 5 },
    { id: 'm_verg10', nome: 'Vergalhão CA-50 10mm (12m)', unidade: 'barra', categoria: 'ferragens', estoqueMinimo: 20 },
    { id: 'm_verg8', nome: 'Vergalhão CA-50 8mm (12m)', unidade: 'barra', categoria: 'ferragens', estoqueMinimo: 20 },
    { id: 'm_arame', nome: 'Arame recozido 18', unidade: 'kg', categoria: 'ferragens', estoqueMinimo: 10 },
    { id: 'm_cabo25', nome: 'Cabo flexível 2,5mm²', unidade: 'm', categoria: 'eletrica_hidraulica', estoqueMinimo: 200 },
    { id: 'm_tubo100', nome: 'Tubo PVC esgoto 100mm (6m)', unidade: 'barra', categoria: 'eletrica_hidraulica', estoqueMinimo: 5 },
    { id: 'm_tubo25', nome: 'Tubo PVC soldável 25mm (6m)', unidade: 'barra', categoria: 'eletrica_hidraulica', estoqueMinimo: 10 },
  ];

  const contasPagar: ContaPagar[] = [];
  const pushConta = (c: Omit<ContaPagar, 'id' | 'criadoEm' | 'documento' | 'parcela' | 'totalParcelas'> & Partial<ContaPagar>) => {
    const conta: ContaPagar = {
      id: id('cp'),
      criadoEm: agora,
      documento: '',
      parcela: 1,
      totalParcelas: 1,
      ...c,
    };
    contasPagar.push(conta);
    return conta;
  };
  /** Marca como paga se o vencimento já passou (exceto quando forçado a ficar pendente). */
  const liquidar = (c: ContaPagar, forma: FormaPagamento, manterPendente = false) => {
    if (!manterPendente && c.vencimento < T) {
      c.status = 'pago';
      c.dataPagamento = c.vencimento;
      c.formaPagamento = forma;
    }
  };

  // ------------------------------------------------------------ compras
  const compras: Compra[] = [];
  type ItemDef = [materialId: string, qtd: number, preco: number];
  interface CompraDef {
    dia: number;
    fornecedorId: string;
    descricao: string;
    doc: string;
    itens: ItemDef[];
    /** quantidade por item, na ordem dos itens */
    destinos?: [CentroId, number[]][];
    /** alternativa: percentuais por centro */
    percentuais?: [CentroId, number][];
    parcelas: number;
    primeiroVenc: number; // dias após a compra
    intervalo?: number;
    forma: FormaPagamento;
    pendentesVencidas?: number[]; // nº de parcelas que ficam em aberto mesmo vencidas
  }

  const criarCompra = (def: CompraDef) => {
    const data = d(def.dia);
    const itens = def.itens.map(([materialId, quantidade, valorUnitario]) => ({
      id: id('ci'),
      materialId,
      quantidade,
      valorUnitario,
    }));
    let destinos: CompraDestino[];
    if (def.percentuais) {
      destinos = def.percentuais.map(([centroId]) => ({ centroId, quantidades: {} }));
      itens.forEach((it) => {
        let restante = it.quantidade;
        def.percentuais!.forEach(([, pct], idx) => {
          const q = idx === def.percentuais!.length - 1 ? restante : Math.round((it.quantidade * pct) / 100);
          destinos[idx].quantidades[it.id] = q;
          restante -= q;
        });
      });
    } else {
      destinos = def.destinos!.map(([centroId, qtds]) => ({
        centroId,
        quantidades: Object.fromEntries(itens.map((it, i) => [it.id, qtds[i] ?? 0])),
      }));
    }
    const compra: Compra = {
      id: id('cmp'),
      data,
      fornecedorId: def.fornecedorId,
      descricao: def.descricao,
      documento: def.doc,
      itens,
      modoRateio: def.percentuais ? 'percentual' : 'quantidade',
      destinos,
      status: 'ativa',
    };
    compras.push(compra);
    const total = compraTotal(compra);
    const dist = compraDistribuicao(compra);
    for (const p of gerarParcelas(total, def.parcelas, addDays(data, def.primeiroVenc), def.intervalo ?? 30)) {
      const c = pushConta({
        descricao: `${def.descricao}${def.parcelas > 1 ? ` (${p.numero}/${def.parcelas})` : ''}`,
        categoria: 'materiais',
        fornecedorId: def.fornecedorId,
        valor: p.valor,
        vencimento: p.vencimento,
        parcela: p.numero,
        totalParcelas: def.parcelas,
        status: 'pendente',
        documento: def.doc,
        origem: 'compra',
        origemId: compra.id,
        distribuicao: escalarDistribuicao(dist, p.valor),
      });
      liquidar(c, def.forma, def.pendentesVencidas?.includes(p.numero));
    }
  };

  const J = 'o_jardins', G = 'o_galeria', V = 'o_vista';
  const compraDefs: CompraDef[] = [
    { dia: -112, fornecedorId: 'f_ceramica', descricao: 'Carrada 10.000 tijolos 8 furos', doc: 'NF 18.442', itens: [['m_tijolo', 10000, 0.89]], destinos: [[J, [6000]], [V, [4000]]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -105, fornecedorId: 'f_cimenteira', descricao: 'Carga de cimento CP-II (300 sacos)', doc: 'NF 77.120', itens: [['m_cimento', 300, 38.9]], percentuais: [[J, 50], [V, 30], [G, 20]], parcelas: 1, primeiroVenc: 28, forma: 'boleto' },
    { dia: -100, fornecedorId: 'f_areal', descricao: 'Areia e brita — 2 caçambas', doc: 'NF 3.981', itens: [['m_areia', 40, 145], ['m_brita', 30, 160]], destinos: [[J, [20, 15]], [V, [20, 15]]], parcelas: 1, primeiroVenc: 21, forma: 'pix' },
    { dia: -98, fornecedorId: 'f_cimenteira', descricao: 'Concreto usinado — fundação Vista Bela', doc: 'NF 77.301', itens: [['m_concreto', 120, 485]], destinos: [[V, [120]]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -90, fornecedorId: 'f_acoforte', descricao: 'Ferragem estrutural (vergalhões + arame)', doc: 'NF 9.554', itens: [['m_verg10', 400, 52], ['m_verg8', 300, 34.5], ['m_arame', 100, 18]], percentuais: [[J, 60], [V, 40]], parcelas: 3, primeiroVenc: 30, forma: 'boleto' },
    { dia: -80, fornecedorId: 'f_ceramica', descricao: 'Blocos de concreto 14x19x39', doc: 'NF 18.610', itens: [['m_bloco', 6000, 4.2]], destinos: [[V, [6000]]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -70, fornecedorId: 'f_cimenteira', descricao: 'Argamassa e cal — reforma Galeria', doc: 'NF 77.488', itens: [['m_argamassa', 200, 29.9], ['m_cal', 100, 22]], destinos: [[G, [200, 100]]], parcelas: 1, primeiroVenc: 28, forma: 'pix' },
    { dia: -65, fornecedorId: 'f_pontocerto', descricao: 'Material elétrico e hidráulico', doc: 'NF 2.207', itens: [['m_cabo25', 2000, 2.89], ['m_tubo100', 60, 78], ['m_tubo25', 150, 18.5]], percentuais: [[G, 50], [J, 50]], parcelas: 1, primeiroVenc: 30, forma: 'boleto' },
    { dia: -60, fornecedorId: 'f_cimenteira', descricao: 'Concreto usinado — lajes Jardins', doc: 'NF 77.590', itens: [['m_concreto', 90, 485]], destinos: [[J, [90]]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -55, fornecedorId: 'f_ceramica', descricao: 'Carrada 20.000 tijolos (rateio + estoque)', doc: 'NF 18.799', itens: [['m_tijolo', 20000, 0.92]], destinos: [[J, [10000]], [V, [7000]], [SEDE, [3000]]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -45, fornecedorId: 'f_cimenteira', descricao: 'Carga fechada de cimento (600 sacos)', doc: 'NF 77.702', itens: [['m_cimento', 600, 39.5]], destinos: [[J, [250]], [G, [100]], [V, [250]]], parcelas: 3, primeiroVenc: 30, forma: 'boleto' },
    { dia: -35, fornecedorId: 'f_areal', descricao: 'Areia e brita — 4 caçambas', doc: 'NF 4.115', itens: [['m_areia', 60, 150], ['m_brita', 40, 165]], destinos: [[J, [25, 15]], [V, [35, 25]]], parcelas: 1, primeiroVenc: 30, forma: 'boleto', pendentesVencidas: [1] },
    { dia: -25, fornecedorId: 'f_acoforte', descricao: 'Ferragem — 2º pavimento', doc: 'NF 9.731', itens: [['m_verg10', 300, 54], ['m_verg8', 200, 36]], percentuais: [[V, 70], [J, 30]], parcelas: 2, primeiroVenc: 30, forma: 'boleto' },
    { dia: -20, fornecedorId: 'f_cimenteira', descricao: 'Concreto usinado — pilares e vigas', doc: 'NF 77.845', itens: [['m_concreto', 150, 490]], destinos: [[V, [100]], [J, [50]]], parcelas: 3, primeiroVenc: 30, forma: 'boleto' },
    { dia: -14, fornecedorId: 'f_pontocerto', descricao: 'Tubos e cabos — Galeria', doc: 'NF 2.390', itens: [['m_tubo25', 120, 19], ['m_cabo25', 1500, 2.95]], destinos: [[G, [120, 1500]]], parcelas: 1, primeiroVenc: 17, forma: 'boleto' },
    { dia: -8, fornecedorId: 'f_cimenteira', descricao: 'Cimento avulso (120 sacos)', doc: 'NF 77.950', itens: [['m_cimento', 120, 39.9]], destinos: [[G, [40]], [J, [80]]], parcelas: 1, primeiroVenc: 0, forma: 'pix' },
  ];
  compraDefs.forEach(criarCompra);

  // ------------------------------------------------------------ movimentações de estoque
  const movimentos: MovimentoEstoque[] = [];
  const saida = (dia: number, materialId: string, local: CentroId, quantidade: number, obs = 'Aplicação na obra') =>
    movimentos.push({ id: id('mv'), data: d(dia), tipo: 'saida', materialId, local, quantidade, observacao: obs });
  const transf = (dia: number, materialId: string, local: CentroId, destino: CentroId, quantidade: number, obs: string) =>
    movimentos.push({ id: id('mv'), data: d(dia), tipo: 'transferencia', materialId, local, destino, quantidade, observacao: obs });
  const ajuste = (dia: number, materialId: string, local: CentroId, quantidade: number, obs: string) =>
    movimentos.push({ id: id('mv'), data: d(dia), tipo: 'ajuste', materialId, local, quantidade, observacao: obs });

  // concreto é aplicado na entrega
  saida(-98, 'm_concreto', V, 120, 'Concretagem da fundação');
  saida(-60, 'm_concreto', J, 90, 'Concretagem das lajes');
  saida(-20, 'm_concreto', V, 100, 'Concretagem pilares/vigas');
  saida(-20, 'm_concreto', J, 50, 'Concretagem pilares/vigas');
  // tijolos
  [[-100, 4000], [-70, 2500], [-40, 5000], [-15, 3500]].forEach(([dd, q]) => saida(dd, 'm_tijolo', J, q, 'Alvenaria'));
  [[-90, 3000], [-50, 4000], [-20, 3000]].forEach(([dd, q]) => saida(dd, 'm_tijolo', V, q, 'Alvenaria'));
  transf(-20, 'm_tijolo', SEDE, G, 1500, 'Envio do estoque da sede para fechamento de vãos');
  saida(-10, 'm_tijolo', G, 1200, 'Fechamento de vãos');
  // cimento
  [[-95, 100], [-60, 40], [-40, 150], [-12, 160]].forEach(([dd, q]) => saida(dd, 'm_cimento', J, q));
  transf(-10, 'm_cimento', J, G, 20, 'Remanejamento para contrapiso');
  [[-68, 50], [-40, 80], [-6, 60]].forEach(([dd, q]) => saida(dd, 'm_cimento', G, q));
  [[-90, 80], [-50, 110], [-25, 100]].forEach(([dd, q]) => saida(dd, 'm_cimento', V, q));
  // areia / brita
  [[-95, 15], [-60, 12], [-20, 10]].forEach(([dd, q]) => saida(dd, 'm_areia', J, q));
  [[-85, 15], [-30, 20]].forEach(([dd, q]) => saida(dd, 'm_areia', V, q));
  ajuste(-7, 'm_areia', V, -2, 'Inventário: perda por chuva/escoamento');
  saida(-60, 'm_brita', J, 20);
  [[-80, 12], [-28, 20]].forEach(([dd, q]) => saida(dd, 'm_brita', V, q));
  // ferragens
  [[-85, 150], [-40, 120]].forEach(([dd, q]) => saida(dd, 'm_verg10', J, q, 'Armação'));
  [[-80, 120], [-45, 140], [-15, 80]].forEach(([dd, q]) => saida(dd, 'm_verg10', V, q, 'Armação'));
  [[-85, 100], [-40, 90]].forEach(([dd, q]) => saida(dd, 'm_verg8', J, q, 'Armação'));
  [[-80, 80], [-45, 100]].forEach(([dd, q]) => saida(dd, 'm_verg8', V, q, 'Armação'));
  saida(-60, 'm_arame', J, 40, 'Armação');
  saida(-60, 'm_arame', V, 25, 'Armação');
  // blocos, argamassa, cal
  [[-75, 2000], [-40, 2000], [-18, 1500]].forEach(([dd, q]) => saida(dd, 'm_bloco', V, q, 'Alvenaria estrutural'));
  [[-50, 80], [-25, 70]].forEach(([dd, q]) => saida(dd, 'm_argamassa', G, q, 'Assentamento de porcelanato'));
  saida(-50, 'm_cal', G, 60, 'Reboco');
  // elétrica / hidráulica
  [[-55, 600], [-30, 800], [-8, 500]].forEach(([dd, q]) => saida(dd, 'm_cabo25', G, q, 'Instalação elétrica'));
  saida(-40, 'm_cabo25', J, 400, 'Instalação elétrica');
  saida(-50, 'm_tubo100', G, 20, 'Rede de esgoto');
  saida(-40, 'm_tubo100', J, 15, 'Rede de esgoto');
  [[-55, 60], [-10, 80]].forEach(([dd, q]) => saida(dd, 'm_tubo25', G, q, 'Rede de água fria'));
  saida(-40, 'm_tubo25', J, 40, 'Rede de água fria');

  // ------------------------------------------------------------ locações
  const locacoes: Locacao[] = [];
  const faturar = (l: Locacao, ate: ISODate, prazo: number, forma: FormaPagamento) => {
    const valor = round2(custoLocacao(l, ate) - l.valorFaturado);
    if (valor <= 0) return;
    const c = pushConta({
      descricao: `Locação ${l.equipamento} — até ${fmtDate(ate)}`,
      categoria: 'locacao',
      fornecedorId: l.fornecedorId,
      valor,
      vencimento: addDays(ate, prazo),
      status: 'pendente',
      origem: 'locacao',
      origemId: l.id,
      distribuicao: [{ centroId: l.obraId, valor }],
    });
    liquidar(c, forma);
    l.valorFaturado = round2(l.valorFaturado + valor);
  };
  const novaLoc = (l: Omit<Locacao, 'id' | 'valorFaturado' | 'horas'> & { horas?: Locacao['horas'] }) => {
    const loc: Locacao = { id: id('loc'), valorFaturado: 0, horas: [], ...l };
    locacoes.push(loc);
    return loc;
  };

  const betoneira = novaLoc({ obraId: J, fornecedorId: 'f_andaimes', equipamento: 'Betoneira 400L', quantidade: 2, tarifa: 'mensal', valor: 380, dataRetirada: d(-110), status: 'ativa' });
  [-80, -50, -20].forEach((x) => faturar(betoneira, d(x), 10, 'boleto'));

  const andaime = novaLoc({ obraId: G, fornecedorId: 'f_andaimes', equipamento: 'Andaime tubular (módulo 1,5m)', quantidade: 40, tarifa: 'mensal', valor: 32, dataRetirada: d(-70), status: 'ativa' });
  [-40, -10].forEach((x) => faturar(andaime, d(x), 10, 'boleto'));

  const retro = novaLoc({ obraId: V, fornecedorId: 'f_locamaq', equipamento: 'Retroescavadeira JCB 3CX', quantidade: 1, tarifa: 'hora', valor: 210, dataRetirada: d(-92), status: 'ativa' });
  for (const dia of eachDay(d(-92), T)) {
    const wd = weekday(dia);
    if (wd === 2 || wd === 4 || (wd === 5 && rnd() < 0.5)) retro.horas.push({ data: dia, horas: 5 + Math.round(rnd() * 3) });
  }
  [-62, -32, -2].forEach((x) => faturar(retro, d(x), 15, 'transferencia'));

  const bobcat = novaLoc({ obraId: V, fornecedorId: 'f_locamaq', equipamento: 'Mini-carregadeira Bobcat S450', quantidade: 1, tarifa: 'diaria', valor: 620, dataRetirada: d(-40), dataDevolucao: d(-26), status: 'devolvida' });
  faturar(bobcat, d(-26), 15, 'boleto');

  novaLoc({ obraId: J, fornecedorId: 'f_locamaq', equipamento: 'Compactador de solo (sapo)', quantidade: 1, tarifa: 'diaria', valor: 95, dataRetirada: d(-12), status: 'ativa' });

  const munck = novaLoc({ obraId: G, fornecedorId: 'f_locamaq', equipamento: 'Caminhão Munck 12t', quantidade: 1, tarifa: 'diaria', valor: 1100, dataRetirada: d(-5), dataDevolucao: d(-4), status: 'devolvida' });
  faturar(munck, d(-4), 14, 'boleto');

  // ------------------------------------------------------------ funcionários
  const funcionarios: Funcionario[] = [
    { id: 'fn_antonio', nome: 'Antônio Ferreira', funcao: 'mestre', regime: 'mensalista', salario: 6800, diaria: 0, telefone: '(84) 99801-1122', cpf: '012.345.678-90', chavePix: '(84) 99801-1122', tipoPix: 'telefone', admissao: '2019-03-11', obraPadraoId: G, ativo: true },
    { id: 'fn_severino', nome: 'Severino Empreiteiro de Alvenaria', apelido: 'Severino', funcao: 'empreiteiro', regime: 'diarista_quinzenal', salario: 0, diaria: 350, telefone: '(84) 99777-8899', cpf: '345.678.901-22', chavePix: '345.678.901-22', tipoPix: 'cpf', admissao: '2022-04-10', obraPadraoId: J, ativo: true },
    { id: 'fn_jose', nome: 'José Carlos Silva', apelido: 'Zé', funcao: 'pedreiro', regime: 'diarista', salario: 0, diaria: 230, telefone: '(84) 99702-3344', cpf: '234.567.890-12', chavePix: '(84) 99702-3344', tipoPix: 'telefone', empreiteiroId: 'fn_severino', admissao: '2021-08-02', obraPadraoId: J, ativo: true },
    { id: 'fn_francisco', nome: 'Francisco das Chagas', apelido: 'Chiquinho', funcao: 'pedreiro', regime: 'diarista_quinzenal', salario: 0, diaria: 220, telefone: '(84) 99603-5566', cpf: '345.678.901-34', chavePix: '(84) 99603-5566', tipoPix: 'telefone', empreiteiroId: 'fn_severino', admissao: '2022-01-17', obraPadraoId: V, ativo: true },
    { id: 'fn_raimundo', nome: 'Raimundo Nonato', funcao: 'pedreiro', regime: 'diarista', salario: 0, diaria: 220, telefone: '(84) 99504-7788', cpf: '456.789.012-45', chavePix: '456.789.012-45', tipoPix: 'cpf', admissao: '2023-05-08', obraPadraoId: J, ativo: true },
    { id: 'fn_marcos', nome: 'Marcos Vinícius Souza', funcao: 'servente', regime: 'diarista', salario: 0, diaria: 140, telefone: '(84) 99405-9900', cpf: '567.890.123-56', chavePix: '(84) 99405-9900', tipoPix: 'telefone', empreiteiroId: 'fn_severino', admissao: '2024-02-19', obraPadraoId: J, ativo: true },
    { id: 'fn_luan', nome: 'Luan Pereira', funcao: 'servente', regime: 'diarista_quinzenal', salario: 0, diaria: 140, telefone: '(84) 99306-1212', cpf: '678.901.234-67', chavePix: '(84) 99306-1212', tipoPix: 'telefone', empreiteiroId: 'fn_severino', admissao: '2024-09-02', obraPadraoId: V, ativo: true },
    { id: 'fn_edson', nome: 'Edson Rodrigues', funcao: 'servente', regime: 'diarista', salario: 0, diaria: 135, telefone: '(84) 99207-3434', cpf: '789.012.345-78', chavePix: '(84) 99207-3434', tipoPix: 'telefone', admissao: '2025-03-10', obraPadraoId: G, ativo: true },
    { id: 'fn_paulo', nome: 'Paulo Henrique Lima', funcao: 'eletricista', regime: 'mensalista', salario: 4300, diaria: 0, telefone: '(84) 99108-5656', cpf: '890.123.456-89', chavePix: 'paulo.lima@email.com', tipoPix: 'outro', admissao: '2020-10-05', ativo: true },
    { id: 'fn_geraldo', nome: 'Geraldo Batista', funcao: 'encanador', regime: 'mensalista', salario: 3950, diaria: 0, telefone: '(84) 99009-7878', cpf: '901.234.567-90', chavePix: '(84) 99009-7878', tipoPix: 'telefone', admissao: '2021-06-14', ativo: true },
    { id: 'fn_sebastiao', nome: 'Sebastião Moura', apelido: 'Tião', funcao: 'armador', regime: 'diarista', salario: 0, diaria: 210, telefone: '(84) 98910-9090', cpf: '012.987.654-32', chavePix: '(84) 98910-9090', tipoPix: 'telefone', admissao: '2023-11-27', obraPadraoId: V, ativo: true },
  ];

  // ------------------------------------------------------------ apontamentos
  const inicioApont = startOfWeek(d(-91));
  const apontamentos: Record<string, Apontamento> = {};
  const centroDoDia = (f: Funcionario, dia: ISODate): CentroId => {
    const wd = weekday(dia);
    let alvo: string | typeof SEDE;
    if (f.id === 'fn_paulo') alvo = wd <= 2 ? G : wd <= 4 ? J : V;
    else if (f.id === 'fn_geraldo') alvo = wd <= 3 ? J : V;
    else if (f.id === 'fn_antonio') alvo = wd === 6 ? SEDE : G;
    else alvo = f.obraPadraoId ?? J;
    if (alvo !== SEDE && !obraAtiva(alvo, dia)) alvo = J;
    return alvo;
  };
  for (const dia of eachDay(inicioApont, T)) {
    const wd = weekday(dia);
    for (const f of funcionarios) {
      const r = rnd();
      // Domingo por padrão folga/falta ou plantão eventual
      const status = wd === 0 ? (r < 0.15 ? 'inteiro' : 'falta') : r < 0.04 ? 'falta' : wd === 6 ? 'meio' : 'inteiro';
      const principal = centroDoDia(f, dia);
      // Eventualmente (5% das vezes) operário atuou em 2 obras no mesmo dia útil
      const multiplas = status !== 'falta' && wd >= 1 && wd <= 5 && r > 0.95;
      const outraObra = principal === J ? G : J;
      const centros = multiplas ? [principal, outraObra] : [principal];
      apontamentos[chaveApontamento(f.id, dia)] = {
        funcionarioId: f.id,
        data: dia,
        centroId: principal,
        centroIds: centros,
        status,
      };
    }
  }

  // ------------------------------------------------------------ fechamentos de folha
  const fechamentos: FechamentoFolha[] = [];
  const semanaAtual = startOfWeek(T);
  const fecharFolha = (f: Funcionario, tipo: 'semanal' | 'mensal', inicio: ISODate, fim: ISODate, venc: ISODate) => {
    const ajustes =
      tipo === 'semanal' && rnd() < 0.18
        ? [{ id: id('aj'), tipo: 'hora_extra' as const, descricao: 'Horas extras concretagem', valor: round2((f.diaria / 8) * 1.5 * 4) }]
        : [];
    const r = calcularFolha(f, inicio, fim, apontamentos, ajustes);
    if (r.total <= 0) return;
    const conta = pushConta({
      descricao: `Folha ${tipo} — ${f.nome} (${fmtDate(inicio).slice(0, 5)} a ${fmtDate(fim).slice(0, 5)})`,
      categoria: 'mao_de_obra',
      funcionarioId: f.id,
      valor: r.total,
      vencimento: venc,
      status: 'pendente',
      origem: 'folha',
      distribuicao: r.distribuicao,
    });
    liquidar(conta, 'pix');
    const fech: FechamentoFolha = {
      id: id('fol'),
      funcionarioId: f.id,
      tipo,
      inicio,
      fim,
      diasTrabalhados: r.diasTrabalhados,
      valorBase: r.valorBase,
      ajustes,
      total: r.total,
      distribuicao: r.distribuicao,
      contaPagarId: conta.id,
      status: 'fechado',
      criadoEm: agora,
    };
    conta.origemId = fech.id;
    fechamentos.push(fech);
  };
  for (let w = inicioApont; w < semanaAtual; w = addDays(w, 7)) {
    for (const f of funcionarios.filter((x) => x.regime === 'diarista')) {
      fecharFolha(f, 'semanal', w, addDays(w, 6), addDays(w, 12));
    }
  }
  for (let m = startOfMonth(addMonths(inicioApont, 1)); monthKey(m) < monthKey(T); m = addMonths(m, 1)) {
    for (const f of funcionarios.filter((x) => x.regime === 'mensalista')) {
      fecharFolha(f, 'mensal', m, endOfMonth(m), `${monthKey(addMonths(m, 1))}-05`);
    }
  }

  // ------------------------------------------------------------ recorrências da sede
  const inicioRec = startOfMonth(d(-120));
  let recorrencias: Recorrencia[] = [
    { id: 'rec_aluguel', descricao: 'Aluguel do escritório', categoria: 'sede_fixo', valor: 3800, diaVencimento: 10, inicio: inicioRec, ativo: true },
    { id: 'rec_contador', descricao: 'Escritório de contabilidade', categoria: 'sede_fixo', valor: 1450, diaVencimento: 15, inicio: inicioRec, ativo: true },
    { id: 'rec_internet', descricao: 'Internet e telefonia', categoria: 'sede_fixo', valor: 389.9, diaVencimento: 20, inicio: inicioRec, ativo: true },
    { id: 'rec_prolabore', descricao: 'Pró-labore dos sócios', categoria: 'sede_fixo', valor: 12000, diaVencimento: 5, inicio: inicioRec, ativo: true },
  ];
  const rec = gerarContasRecorrentes(recorrencias, T);
  recorrencias = rec.recorrencias;
  rec.novas.forEach((c) => {
    c.id = id('cp');
    contasPagar.push(c);
    liquidar(c, c.categoria === 'sede_fixo' ? 'transferencia' : 'pix');
  });

  // ------------------------------------------------------------ despesas avulsas (já pagas)
  const despesas: [number, CentroId, CategoriaGasto, number, string, FormaPagamento][] = [
    [-88, SEDE, 'combustivel', 420, 'Combustível caminhonete Strada', 'cartao'],
    [-76, J, 'alimentacao', 685, 'Almoço da equipe — concretagem', 'pix'],
    [-63, G, 'ferramentas', 349.9, 'Discos de corte e brocas', 'cartao'],
    [-58, SEDE, 'combustivel', 455, 'Combustível caminhonete Strada', 'cartao'],
    [-47, V, 'frete', 380, 'Frete de entulho (caçamba)', 'pix'],
    [-33, J, 'ferramentas', 1290, 'Martelete rompedor Bosch', 'cartao'],
    [-27, SEDE, 'combustivel', 470, 'Combustível caminhonete Strada', 'cartao'],
    [-19, V, 'alimentacao', 540, 'Café da manhã equipe (semana)', 'dinheiro'],
    [-9, G, 'frete', 250, 'Frete de porcelanato', 'pix'],
    [-4, SEDE, 'impostos', 1380, 'Taxa de alvará — Vista Bela', 'boleto'],
    [-2, J, 'combustivel', 210, 'Gasolina — gerador da obra', 'dinheiro'],
  ];
  despesas.forEach(([dia, centro, categoria, valor, descricao, forma]) =>
    pushConta({
      descricao,
      categoria,
      valor,
      vencimento: d(dia),
      status: 'pago',
      dataPagamento: d(dia),
      formaPagamento: forma,
      origem: 'despesa',
      distribuicao: [{ centroId: centro, valor }],
    }),
  );

  // ------------------------------------------------------------ contas a receber (medições)
  const contasReceber: ContaReceber[] = [];
  const medicao = (obraId: string, dia: number, pct: number, descricao: string, receber: boolean | 'atrasar') => {
    const obra = obras.find((o) => o.id === obraId)!;
    const valor = round2((obra.valorContrato * pct) / 100);
    const venc = d(dia);
    const recebido = receber === true && venc < T;
    contasReceber.push({
      id: id('cr'),
      obraId,
      descricao,
      valor,
      vencimento: venc,
      status: recebido ? 'recebido' : 'pendente',
      dataRecebimento: recebido ? venc : undefined,
      formaPagamento: recebido ? 'transferencia' : undefined,
      documento: '',
    });
  };
  medicao(J, -120, 10, 'Sinal de contrato (10%)', true);
  medicao(J, -90, 8, '1ª medição (8%)', true);
  medicao(J, -60, 8, '2ª medição (8%)', true);
  medicao(J, -30, 8, '3ª medição (8%)', true);
  medicao(J, 5, 8, '4ª medição (8%)', true);
  medicao(G, -75, 20, 'Entrada (20%)', true);
  medicao(G, -45, 15, '1ª medição (15%)', true);
  medicao(G, -15, 15, '2ª medição (15%)', true);
  medicao(G, -4, 10, 'Aditivo — forro de gesso (10%)', 'atrasar');
  medicao(G, 26, 15, '3ª medição (15%)', true);
  medicao(V, -95, 8, 'Sinal de contrato (8%)', true);
  medicao(V, -65, 6, '1ª medição (6%)', true);
  medicao(V, -35, 6, '2ª medição (6%)', true);
  medicao(V, -5, 6, '3ª medição (6%)', true);
  medicao(V, 25, 6, '4ª medição (6%)', true);

  // ------------------------------------------------------------ serviços por empreitada
  const servicos: ServicoEmpreitada[] = [];
  const criarServico = (
    obraId: string,
    prestadorNome: string,
    prestadorContato: string,
    funcao: string,
    descricao: string,
    diaInicio: number,
    diaEntrega: number,
    etapasDefs: { desc: string; valor: number; diaVenc: number }[],
  ) => {
    const servId = id('srv');
    const valorTotal = etapasDefs.reduce((s, e) => s + e.valor, 0);
    const etapas: EtapaServico[] = [];

    etapasDefs.forEach((eDef, idx) => {
      const etapaId = id('etp');
      const venc = d(eDef.diaVenc);
      const conta = pushConta({
        descricao: `Empreitada: ${descricao} (${idx + 1}/${etapasDefs.length} - ${eDef.desc})`,
        categoria: 'servicos',
        valor: eDef.valor,
        vencimento: venc,
        status: 'pendente',
        origem: 'servico',
        origemId: servId,
        distribuicao: [{ centroId: obraId, valor: eDef.valor }],
      });
      liquidar(conta, 'pix');

      etapas.push({
        id: etapaId,
        descricao: eDef.desc,
        valor: eDef.valor,
        vencimento: venc,
        status: conta.status === 'pago' ? 'pago' : 'pendente',
        contaPagarId: conta.id,
      });
    });

    servicos.push({
      id: servId,
      obraId,
      prestadorNome,
      prestadorContato,
      funcao,
      descricao,
      valorTotal,
      dataInicio: d(diaInicio),
      previsaoEntrega: d(diaEntrega),
      status: 'andamento',
      etapas,
      criadoEm: agora,
    });
  };

  criarServico(
    G,
    'Carlos Eduardo Eletricista ME',
    '(11) 98765-4321',
    'Eletricista',
    'Instalação Elétrica Completa e Quadros',
    -40,
    15,
    [
      { desc: 'Entrada e infraestrutura de tubulação', valor: 6000, diaVenc: -35 },
      { desc: 'Passagem de fiação e quadros de disjuntores', valor: 7500, diaVenc: -10 },
      { desc: 'Acabamento de iluminação, tomadas e testes', valor: 5000, diaVenc: 15 },
    ],
  );

  criarServico(
    J,
    'Empreiteira Silva & Filhos',
    '(11) 97654-3210',
    'Pintor',
    'Pintura Externa e Textura Projetada',
    -30,
    25,
    [
      { desc: 'Lixamento, fundo e selador acrílico (30%)', valor: 7200, diaVenc: -25 },
      { desc: 'Aplicação da textura projetada (40%)', valor: 9600, diaVenc: -5 },
      { desc: 'Segunda demão e acabamentos finais (30%)', valor: 7200, diaVenc: 25 },
    ],
  );

  criarServico(
    V,
    'Marcos Gesso & Drywall',
    '(11) 99123-4567',
    'Gesseiro',
    'Forro de Gesso Acartonado / Drywall',
    -20,
    12,
    [
      { desc: 'Estruturação metálica e tirantes (50%)', valor: 7000, diaVenc: -15 },
      { desc: 'Chapeamento e emassamento de juntas (50%)', valor: 7000, diaVenc: 12 },
    ],
  );

  // ------------------------------------------------------------ auditoria
  const audit: AuditEntry[] = [
    { id: id('au'), ts: new Date(Date.now() - 86_400_000 * 2).toISOString(), perfil: 'admin', acao: 'Compra', descricao: 'Lançou "Concreto usinado — pilares e vigas" com rateio Vista Bela/Jardins' },
    { id: id('au'), ts: new Date(Date.now() - 86_400_000).toISOString(), perfil: 'encarregado', acao: 'Estoque', descricao: 'Transferiu 20 sacos de cimento de Jardins para Galeria' },
    { id: id('au'), ts: agora, perfil: 'admin', acao: 'Sistema', descricao: 'Dados de demonstração carregados' },
  ];

  // ------------------------------------------------------------ tarefas & lembretes
  const tarefas: Tarefa[] = [
    {
      id: 'tar_1',
      titulo: 'Receber entrega de cimento e areia lavada',
      observacoes: 'Verificar se veio a quantidade correta na NF (40 sacos de CP-II)',
      data: T,
      diaInteiro: true,
      horario: '08:00',
      recorrencia: 'nenhuma',
      prioridade: 'alta',
      obraId: 'o_jardins',
      concluida: false,
      criadoEm: agora,
    },
    {
      id: 'tar_2',
      titulo: 'Reunião de alinhamento com encarregado no canteiro',
      observacoes: 'Definir frente de trabalho para a concretagem da laje',
      data: T,
      diaInteiro: false,
      horario: '14:30',
      recorrencia: 'semanal',
      prioridade: 'media',
      obraId: 'o_jardins',
      concluida: false,
      criadoEm: agora,
    },
    {
      id: 'tar_3',
      titulo: 'Conferir medição e repasse com Severino Empreiteiro',
      observacoes: 'Checar área de alvenaria concluída no 2º pavimento',
      data: d(1),
      diaInteiro: true,
      horario: '08:00',
      recorrencia: 'quinzenal',
      prioridade: 'alta',
      obraId: 'o_galeria',
      concluida: false,
      criadoEm: agora,
    },
    {
      id: 'tar_4',
      titulo: 'Renovação da locação do andaime tubular',
      observacoes: 'Ligar para a fornecedora Andaimes & Cia',
      data: d(2),
      diaInteiro: false,
      horario: '10:00',
      recorrencia: 'mensal',
      prioridade: 'media',
      obraId: 'o_galeria',
      concluida: false,
      criadoEm: agora,
    },
    {
      id: 'tar_5',
      titulo: 'Vistoria técnica de instalações elétricas',
      observacoes: 'Acompanhar engenheiro eletricista',
      data: d(-1),
      diaInteiro: true,
      horario: '08:00',
      recorrencia: 'nenhuma',
      prioridade: 'baixa',
      obraId: 'o_vista',
      concluida: true,
      concluidaEm: d(-1),
      criadoEm: agora,
    },
  ];

  return {
    version: DATA_VERSION,
    config: { empresa: 'CONSTRUTEC', saldoInicial: 85_000, dataSaldoInicial: d(-125) },
    obras,
    fornecedores,
    materiais,
    compras,
    movimentos,
    locacoes,
    funcionarios,
    funcoesCustomizadas: [],
    apontamentos,
    fechamentos,
    servicos,
    tarefas,
    contasPagar,
    contasReceber,
    recorrencias,
    audit,
  };
}

export function dadosVazios(hoje: ISODate = today()): ErpData {
  return {
    version: DATA_VERSION,
    config: { empresa: 'CONSTRUTEC', saldoInicial: 0, dataSaldoInicial: hoje },
    obras: [],
    fornecedores: [],
    materiais: [],
    compras: [],
    movimentos: [],
    locacoes: [],
    funcionarios: [],
    funcoesCustomizadas: [],
    apontamentos: {},
    fechamentos: [],
    servicos: [],
    tarefas: [],
    contasPagar: [],
    contasReceber: [],
    recorrencias: [],
    audit: [],
  };
}
