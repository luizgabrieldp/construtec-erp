import type {
  CategoriaFornecedor,
  CategoriaGasto,
  FormaPagamento,
  Funcao,
  ObraStatus,
  ObraFase,
  PeriodicidadeRecebimento,
  StatusPresenca,
  StatusServico,
  TarifaLocacao,
  TipoAjusteFolha,
  Unidade,
} from './types';

export const LABEL_CATEGORIA_FORNECEDOR: Record<CategoriaFornecedor, string> = {
  areia_brita: 'Areia / Brita',
  cimento: 'Cimento / Argamassa',
  ferragens: 'Ferragens',
  locacao: 'Locação de Máquinas',
  eletrica_hidraulica: 'Elétrica / Hidráulica',
  ceramica_tijolos: 'Cerâmica / Tijolos',
  madeira: 'Madeira',
  outros: 'Outros',
};

export const LABEL_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  materiais: 'Materiais',
  mao_de_obra: 'Mão de Obra',
  servicos: 'Serviços Terceirizados / Empreitadas',
  locacao: 'Locação de Maquinário',
  sede_fixo: 'Custo Fixo da Sede',
  combustivel: 'Combustível',
  alimentacao: 'Alimentação',
  frete: 'Frete',
  ferramentas: 'Ferramentas',
  impostos: 'Impostos e Taxas',
  outros: 'Outros',
};

export const LABEL_UNIDADE: Record<Unidade, string> = {
  un: 'un',
  saco: 'saco',
  m3: 'm³',
  kg: 'kg',
  m: 'm',
  barra: 'barra',
  m2: 'm²',
  lata: 'lata',
  milheiro: 'milheiro',
};

export const LABEL_FUNCAO: Record<string, string> = {
  mestre: 'Mestre de Obras',
  pedreiro: 'Pedreiro',
  servente: 'Servente',
  eletricista: 'Eletricista',
  encanador: 'Encanador',
  carpinteiro: 'Carpinteiro',
  pintor: 'Pintor',
  armador: 'Armador',
  empreiteiro: 'Empreiteiro',
};

export function getLabelFuncao(funcao: string): string {
  return LABEL_FUNCAO[funcao] || funcao;
}

export const LABEL_REGIME: Record<string, string> = {
  diarista: 'Diarista Semanal',
  diarista_quinzenal: 'Diarista Quinzenal',
  mensalista: 'Mensalista (Fixo)',
};

export const LABEL_OBRA_STATUS: Record<ObraStatus, string> = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

export const LABEL_OBRA_FASE: Record<ObraFase, string> = {
  fundacao: 'Fundação',
  estrutura: 'Estrutura',
  alvenaria: 'Alvenaria',
  instalacoes: 'Instalações',
  acabamento: 'Acabamento & Entrega',
};

export const FASES_OBRA_LISTA: { id: ObraFase; label: string; ordem: number; cor: string }[] = [
  { id: 'fundacao', label: 'Fundação', ordem: 1, cor: '#8B5CF6' },
  { id: 'estrutura', label: 'Estrutura', ordem: 2, cor: '#3B82F6' },
  { id: 'alvenaria', label: 'Alvenaria', ordem: 3, cor: '#F59E0B' },
  { id: 'instalacoes', label: 'Instalações', ordem: 4, cor: '#06B6D4' },
  { id: 'acabamento', label: 'Acabamento & Entrega', ordem: 5, cor: '#10B981' },
];

export const LABEL_TARIFA: Record<TarifaLocacao, string> = {
  diaria: 'Diária',
  mensal: 'Mensal',
  hora: 'Por hora',
};

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  transferencia: 'Transferência',
};

export const LABEL_PRESENCA: Record<StatusPresenca, string> = {
  inteiro: 'Dia inteiro',
  meio: 'Meio período',
  falta: 'Falta',
};

export const LABEL_AJUSTE: Record<TipoAjusteFolha, string> = {
  hora_extra: 'Hora extra',
  vale: 'Vale',
  adiantamento: 'Adiantamento',
  bonus: 'Bônus',
  desconto: 'Desconto',
};

export const LABEL_STATUS_SERVICO: Record<StatusServico, string> = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const LABEL_PERIODICIDADE_RECEBIMENTO: Record<PeriodicidadeRecebimento, string> = {
  semanal: 'Semanal (a cada 7 dias)',
  quinzenal: 'Quinzenal (a cada 15 dias)',
  mensal: 'Mensal (a cada 30 dias)',
};

export const LABEL_RECORRENCIA_TAREFA: Record<string, string> = {
  nenhuma: 'Não se repete',
  diaria: 'Todos os dias',
  dias_uteis: 'Segunda a Sexta',
  semanal: 'Toda semana',
  quinzenal: 'A cada 15 dias',
  mensal: 'Todo mês',
};

export const LABEL_PRIORIDADE_TAREFA: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};
