/**
 * Modelo de domínio do CONSTRUTEC ERP.
 * Datas são sempre strings ISO "YYYY-MM-DD" (sem fuso) para evitar bugs de timezone.
 */

export type ID = string;
export type ISODate = string;

/** Centro de custo: id de uma obra ou a Sede/Matriz. */
export const SEDE = 'sede' as const;
export type CentroId = ID | typeof SEDE;

export type Perfil = 'admin' | 'encarregado';
export type ThemePref = 'light' | 'dark' | 'system';

// ---------------------------------------------------------------- Obras
export type ObraStatus = 'planejamento' | 'andamento' | 'pausada' | 'concluida';
export type ObraFase = 'fundacao' | 'estrutura' | 'alvenaria' | 'instalacoes' | 'acabamento';

export interface Obra {
  id: ID;
  nome: string;
  endereco: string;
  responsavel?: string; // encarregado / engenheiro (opcional)
  arquiteto?: string; // arquiteto responsável (opcional)
  cliente: string;
  dataInicio: ISODate;
  previsaoEntrega: ISODate;
  orcamento: number; // orçamento previsto de custo (opcional)
  valorContrato: number; // valor vendido ao cliente (opcional)
  status: ObraStatus;
  fase?: ObraFase; // fase atual da obra (opcional, default 'fundacao')
  cor: string; // cor da obra em gráficos
}

// ---------------------------------------------------------------- Fornecedores
export type CategoriaFornecedor =
  | 'areia_brita'
  | 'cimento'
  | 'ferragens'
  | 'locacao'
  | 'eletrica_hidraulica'
  | 'ceramica_tijolos'
  | 'madeira'
  | 'outros';

export interface Fornecedor {
  id: ID;
  nome: string;
  categoria: CategoriaFornecedor;
  cnpj: string;
  contato: string;
  telefone: string;
  cidade: string;
}

// ---------------------------------------------------------------- Materiais & estoque
export type Unidade = 'un' | 'saco' | 'm3' | 'kg' | 'm' | 'barra' | 'm2' | 'lata' | 'milheiro';

export interface Material {
  id: ID;
  nome: string;
  unidade: Unidade;
  categoria: CategoriaFornecedor;
  estoqueMinimo: number;
}

export interface CompraItem {
  id: ID;
  materialId: ID;
  quantidade: number;
  valorUnitario: number;
}

/** Quantidades finais por centro de custo para cada item da compra. */
export interface CompraDestino {
  centroId: CentroId;
  quantidades: Record<ID, number>; // itemId -> quantidade
}

export type ModoRateio = 'quantidade' | 'percentual';

export interface Compra {
  id: ID;
  data: ISODate;
  fornecedorId: ID;
  descricao: string;
  documento: string; // nº NF / pedido
  itens: CompraItem[];
  modoRateio: ModoRateio;
  destinos: CompraDestino[];
  status: 'ativa' | 'cancelada';
}

/**
 * Movimentações manuais de estoque. Entradas de compra são DERIVADAS das compras ativas
 * (não ficam gravadas aqui), o que evita inconsistência ao cancelar/editar compras.
 */
export type TipoMovimento = 'saida' | 'transferencia' | 'ajuste';

export interface MovimentoEstoque {
  id: ID;
  data: ISODate;
  tipo: TipoMovimento;
  materialId: ID;
  /** saída/ajuste: local afetado. transferência: origem. */
  local: CentroId;
  /** somente transferência */
  destino?: CentroId;
  /** saída/transferência: positivo. ajuste: + sobra / - perda */
  quantidade: number;
  observacao: string;
}

// ---------------------------------------------------------------- Locações
export type TarifaLocacao = 'diaria' | 'mensal' | 'hora';

export interface ApontamentoHoras {
  data: ISODate;
  horas: number;
}

export interface Locacao {
  id: ID;
  obraId: ID;
  fornecedorId: ID;
  equipamento: string;
  quantidade: number;
  tarifa: TarifaLocacao;
  valor: number; // valor unitário da tarifa
  dataRetirada: ISODate;
  dataDevolucao?: ISODate;
  horas: ApontamentoHoras[];
  /** valor já transformado em contas a pagar */
  valorFaturado: number;
  status: 'ativa' | 'devolvida' | 'cancelada';
}

// ---------------------------------------------------------------- Funcionários & folha
export type FuncaoPadrao =
  | 'mestre'
  | 'pedreiro'
  | 'servente'
  | 'eletricista'
  | 'encanador'
  | 'carpinteiro'
  | 'pintor'
  | 'armador'
  | 'empreiteiro';

export type Funcao = FuncaoPadrao | (string & {});

export type Regime = 'mensalista' | 'diarista' | 'diarista_quinzenal';

export type TipoPix = 'telefone' | 'cpf' | 'aleatoria' | 'outro';

export interface Funcionario {
  id: ID;
  nome: string;
  apelido?: string;
  funcao: Funcao;
  regime: Regime;
  salario: number; // mensalista
  diaria: number; // diarista / diarista_quinzenal
  telefone: string;
  cpf?: string;
  chavePix?: string;
  tipoPix?: TipoPix;
  empreiteiroId?: ID; // ID de colaborador empreiteiro responsável
  admissao: ISODate;
  obraPadraoId?: ID;
  ativo: boolean;
}

export type StatusPresenca = 'inteiro' | 'meio' | 'falta';

export interface Apontamento {
  funcionarioId: ID;
  data: ISODate;
  centroId: CentroId;
  centroIds?: CentroId[]; // múltiplas obras onde esteve presente no dia
  status: StatusPresenca;
}

export type TipoAjusteFolha = 'hora_extra' | 'vale' | 'adiantamento' | 'bonus' | 'desconto';

export interface AjusteFolha {
  id: ID;
  tipo: TipoAjusteFolha;
  descricao: string;
  valor: number; // positivo = acréscimo, negativo = desconto
}

export interface Distribuicao {
  centroId: CentroId;
  valor: number;
}

export interface FechamentoFolha {
  id: ID;
  funcionarioId: ID;
  tipo: 'semanal' | 'quinzenal' | 'mensal';
  inicio: ISODate;
  fim: ISODate;
  diasTrabalhados: number;
  valorBase: number;
  ajustes: AjusteFolha[];
  total: number;
  distribuicao: Distribuicao[];
  contaPagarId: ID;
  status: 'fechado' | 'reaberto';
  criadoEm: string;
}

// ---------------------------------------------------------------- Serviços por Empreitada
export type PeriodicidadeRecebimento = 'semanal' | 'quinzenal' | 'mensal';
export type StatusServico = 'planejamento' | 'andamento' | 'concluido' | 'cancelado';

export interface EtapaServico {
  id: ID;
  descricao: string;
  valor: number;
  vencimento: ISODate;
  status: 'pendente' | 'pago';
  contaPagarId?: ID;
}

export interface ServicoEmpreitada {
  id: ID;
  obraId: ID;
  prestadorNome: string;
  prestadorContato: string;
  funcao: string; // Ex: Eletricista, Pintor, Gesseiro, Encanador
  descricao: string;
  valorTotal: number;
  dataInicio: ISODate;
  previsaoEntrega: ISODate;
  dataConclusao?: ISODate;
  status: StatusServico;
  etapas: EtapaServico[];
  observacoes?: string;
  criadoEm: string;
}

// ---------------------------------------------------------------- Financeiro
export type CategoriaGasto =
  | 'materiais'
  | 'mao_de_obra'
  | 'servicos'
  | 'locacao'
  | 'sede_fixo'
  | 'combustivel'
  | 'alimentacao'
  | 'frete'
  | 'ferramentas'
  | 'impostos'
  | 'outros';

export type FormaPagamento = 'pix' | 'boleto' | 'dinheiro' | 'cartao' | 'transferencia';

export type OrigemConta = 'compra' | 'locacao' | 'folha' | 'servico' | 'recorrencia' | 'despesa' | 'manual';

export interface ContaPagar {
  id: ID;
  descricao: string;
  categoria: CategoriaGasto;
  fornecedorId?: ID;
  funcionarioId?: ID;
  valor: number;
  vencimento: ISODate;
  parcela: number;
  totalParcelas: number;
  status: 'pendente' | 'pago' | 'cancelado';
  dataPagamento?: ISODate;
  formaPagamento?: FormaPagamento;
  documento: string;
  origem: OrigemConta;
  origemId?: ID;
  /** Como o valor desta conta se distribui entre centros de custo (soma = valor). */
  distribuicao: Distribuicao[];
  criadoEm: string;
}

export interface ContaReceber {
  id: ID;
  obraId: ID;
  descricao: string;
  valor: number;
  vencimento: ISODate;
  status: 'pendente' | 'recebido' | 'cancelado';
  dataRecebimento?: ISODate;
  formaPagamento?: FormaPagamento;
  documento: string;
}

export interface Recorrencia {
  id: ID;
  descricao: string;
  categoria: CategoriaGasto;
  fornecedorId?: ID;
  valor: number;
  diaVencimento: number;
  inicio: ISODate;
  ativo: boolean;
  /** último mês gerado "YYYY-MM" */
  ultimaGeracao?: string;
}

// ---------------------------------------------------------------- Tarefas & Lembretes
export type RecorrenciaTarefa =
  | 'nenhuma'
  | 'diaria'
  | 'dias_uteis'
  | 'semanal'
  | 'quinzenal'
  | 'mensal';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta';

export interface Tarefa {
  id: ID;
  titulo: string;
  observacoes?: string;
  data: ISODate; // Data prevista YYYY-MM-DD
  diaInteiro: boolean; // se true, horário padrão para aviso é 08:00
  horario?: string; // HH:mm (quando não for dia inteiro)
  recorrencia: RecorrenciaTarefa;
  recorrenciaPersonalizada?: string;
  prioridade?: PrioridadeTarefa;
  obraId?: ID;
  concluida: boolean;
  concluidaEm?: string;
  criadoEm: string;
}

// ---------------------------------------------------------------- Sistema
export interface AuditEntry {
  id: ID;
  ts: string;
  perfil: Perfil;
  acao: string;
  descricao: string;
}

export interface Config {
  empresa: string;
  saldoInicial: number;
  dataSaldoInicial: ISODate;
}

/** Todo o estado persistido do ERP. */
export interface ErpData {
  version: number;
  config: Config;
  obras: Obra[];
  fornecedores: Fornecedor[];
  materiais: Material[];
  compras: Compra[];
  movimentos: MovimentoEstoque[];
  locacoes: Locacao[];
  funcionarios: Funcionario[];
  funcoesCustomizadas?: string[];
  apontamentos: Record<string, Apontamento>; // chave `${funcionarioId}|${data}`
  fechamentos: FechamentoFolha[];
  servicos: ServicoEmpreitada[];
  tarefas: Tarefa[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  recorrencias: Recorrencia[];
  audit: AuditEntry[];
}
