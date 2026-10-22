/**
 * Regras de negócio puras (sem React / sem store). Reutilizadas pelo gerador de mock,
 * pelas ações do store e pelos seletores de relatórios.
 */
import type {
  AjusteFolha,
  Apontamento,
  CentroId,
  Compra,
  ContaPagar,
  Distribuicao,
  Funcionario,
  ISODate,
  Locacao,
  PeriodicidadeRecebimento,
  Recorrencia,
  StatusPresenca,
} from './types';
import { SEDE } from './types';
import { addDays, addMonths, diasUteisMes, diffDays, eachDay, endOfMonth, minDate, monthKey } from '@/lib/dates';
import { round2 } from '@/lib/format';

// ---------------------------------------------------------------- utilitários

/** Divide `total` proporcionalmente aos pesos, garantindo que a soma feche em centavos. */
export function distribuirProporcional(total: number, pesos: Partial<Record<CentroId, number>>): Distribuicao[] {
  const entries = Object.entries(pesos).filter(([, p]) => (p ?? 0) > 0) as [CentroId, number][];
  const soma = entries.reduce((s, [, p]) => s + p, 0);
  if (soma <= 0 || total === 0) return total === 0 ? [] : [{ centroId: SEDE, valor: round2(total) }];
  const out = entries.map(([centroId, p]) => ({ centroId, valor: round2((total * p) / soma) }));
  const diff = round2(total - out.reduce((s, d) => s + d.valor, 0));
  if (diff !== 0) {
    const maior = out.reduce((a, b) => (b.valor > a.valor ? b : a));
    maior.valor = round2(maior.valor + diff);
  }
  return out;
}

export function somaDistribuicao(d: Distribuicao[]): number {
  return round2(d.reduce((s, x) => s + x.valor, 0));
}

/** Multiplica uma distribuição por um fator (ex.: parcela = 1/3 da compra). */
export function escalarDistribuicao(d: Distribuicao[], total: number): Distribuicao[] {
  return distribuirProporcional(
    total,
    Object.fromEntries(d.map((x) => [x.centroId, x.valor])) as Record<CentroId, number>,
  );
}

// ---------------------------------------------------------------- compras

export function compraTotal(c: Pick<Compra, 'itens'>): number {
  return round2(c.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0));
}

/** Valor da compra por centro de custo, a partir das quantidades rateadas. */
export function compraDistribuicao(c: Pick<Compra, 'itens' | 'destinos'>): Distribuicao[] {
  const precos = Object.fromEntries(c.itens.map((i) => [i.id, i.valorUnitario]));
  const pesos: Record<CentroId, number> = {};
  for (const d of c.destinos) {
    const v = Object.entries(d.quantidades).reduce((s, [itemId, q]) => s + q * (precos[itemId] ?? 0), 0);
    pesos[d.centroId] = (pesos[d.centroId] ?? 0) + v;
  }
  return distribuirProporcional(compraTotal(c), pesos);
}

export interface ParcelaGerada {
  numero: number;
  valor: number;
  vencimento: ISODate;
}

/** Gera N parcelas iguais (ajuste de centavos na última). */
export function gerarParcelas(total: number, n: number, primeiroVenc: ISODate, intervaloDias = 30): ParcelaGerada[] {
  const base = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    valor: i === n - 1 ? round2(total - base * (n - 1)) : base,
    vencimento: addDays(primeiroVenc, i * intervaloDias),
  }));
}

/** Gera parcelas de cronograma de recebimento/pagamento respeitando periodicidade (semanal, quinzenal ou mensal). */
export function gerarParcelasCronograma(
  total: number,
  n: number,
  primeiroVenc: ISODate,
  periodicidade: PeriodicidadeRecebimento,
): ParcelaGerada[] {
  const base = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    let venc: ISODate;
    if (periodicidade === 'semanal') {
      venc = addDays(primeiroVenc, i * 7);
    } else if (periodicidade === 'quinzenal') {
      venc = addDays(primeiroVenc, i * 15);
    } else {
      venc = addMonths(primeiroVenc, i);
    }
    return {
      numero: i + 1,
      valor: i === n - 1 ? round2(total - base * (n - 1)) : base,
      vencimento: venc,
    };
  });
}

// ---------------------------------------------------------------- locações

/** Data final efetiva de apuração da locação. */
export function fimApuracao(l: Locacao, ate: ISODate): ISODate {
  return l.dataDevolucao ? minDate(l.dataDevolucao, ate) : ate;
}

/** Custo acumulado da locação até `ate` (inclusive). */
export function custoLocacao(l: Locacao, ate: ISODate): number {
  if (l.status === 'cancelada' || ate < l.dataRetirada) return 0;
  const fim = fimApuracao(l, ate);
  switch (l.tarifa) {
    case 'diaria':
      return round2((diffDays(l.dataRetirada, fim) + 1) * l.valor * l.quantidade);
    case 'mensal':
      return round2(((diffDays(l.dataRetirada, fim) + 1) / 30) * l.valor * l.quantidade);
    case 'hora':
      return round2(l.horas.filter((h) => h.data <= fim).reduce((s, h) => s + h.horas, 0) * l.valor);
  }
}

export function diasLocacao(l: Locacao, ate: ISODate): number {
  if (ate < l.dataRetirada) return 0;
  return diffDays(l.dataRetirada, fimApuracao(l, ate)) + 1;
}

// ---------------------------------------------------------------- folha

export const FATOR_PRESENCA: Record<StatusPresenca, number> = { inteiro: 1, meio: 0.5, falta: 0 };

export const chaveApontamento = (funcionarioId: string, data: ISODate) => `${funcionarioId}|${data}`;

/** Custo de um dia de trabalho (mensalista: salário / dias úteis Seg–Sáb do mês). */
export function valorDia(f: Funcionario, data: ISODate): number {
  return f.regime === 'mensalista' ? f.salario / diasUteisMes(data) : f.diaria;
}

export interface ResultadoFolha {
  diasTrabalhados: number;
  valorBase: number;
  totalAjustes: number;
  total: number;
  distribuicao: Distribuicao[];
  porCentroDias: Record<CentroId, number>;
}

/**
 * Calcula a folha de um funcionário no período.
 * - Diarista (semanal ou quinzenal): soma das diárias (meio período = 0,5).
 * - Mensalista: salário fixo, rateado entre centros pela proporção de dias apontados.
 * Ajustes são distribuídos na mesma proporção.
 */
export function calcularFolha(
  f: Funcionario,
  inicio: ISODate,
  fim: ISODate,
  apontamentos: Record<string, Apontamento>,
  ajustes: AjusteFolha[] = [],
  tipoFechamento: 'semanal' | 'quinzenal' | 'mensal' = 'semanal',
): ResultadoFolha {
  const porCentroDias: Record<CentroId, number> = {};
  let dias = 0;
  for (const d of eachDay(inicio, fim)) {
    const a = apontamentos[chaveApontamento(f.id, d)];
    if (!a) continue;
    const fator = FATOR_PRESENCA[a.status];
    if (!fator) continue;
    dias += fator;
    const centros = a.centroIds && a.centroIds.length > 0 ? a.centroIds : [a.centroId];
    const fatorPorCentro = fator / centros.length;
    for (const cid of centros) {
      porCentroDias[cid] = (porCentroDias[cid] ?? 0) + fatorPorCentro;
    }
  }
  let valorBase = 0;
  if (f.regime === 'diarista' || f.regime === 'diarista_quinzenal') {
    valorBase = round2(dias * f.diaria);
  } else {
    // mensalista
    if (tipoFechamento === 'quinzenal') {
      valorBase = round2(f.salario / 2);
    } else if (tipoFechamento === 'semanal') {
      valorBase = round2(f.salario / 4);
    } else {
      valorBase = round2(f.salario);
    }
  }
  const totalAjustes = round2(ajustes.reduce((s, a) => s + a.valor, 0));
  const total = round2(Math.max(0, valorBase + totalAjustes));
  const pesos = dias > 0 ? porCentroDias : { [SEDE]: 1 };
  return {
    diasTrabalhados: dias,
    valorBase,
    totalAjustes,
    total,
    distribuicao: distribuirProporcional(total, pesos),
    porCentroDias,
  };
}

// ---------------------------------------------------------------- recorrências

/**
 * Gera as contas a pagar mensais das recorrências até o mês de `ate` (inclusive).
 * Retorna as novas contas e as recorrências atualizadas (ultimaGeracao).
 */
export function gerarContasRecorrentes(
  recorrencias: Recorrencia[],
  ate: ISODate,
): { novas: ContaPagar[]; recorrencias: Recorrencia[] } {
  const novas: ContaPagar[] = [];
  const alvo = monthKey(ate);
  const atualizadas = recorrencias.map((r) => {
    if (!r.ativo) return r;
    let cursor = r.ultimaGeracao ? addMonths(`${r.ultimaGeracao}-01`, 1) : `${monthKey(r.inicio)}-01`;
    let ultima = r.ultimaGeracao;
    while (monthKey(cursor) <= alvo) {
      const dia = Math.min(r.diaVencimento, Number(endOfMonth(cursor).slice(8)));
      const venc = `${monthKey(cursor)}-${String(dia).padStart(2, '0')}`;
      const mesRef = monthKey(cursor);
      novas.push({
        id: `cp_rec_${r.id}_${mesRef}`,
        descricao: `${r.descricao} — ${mesRef.split('-').reverse().join('/')}`,
        categoria: r.categoria,
        fornecedorId: r.fornecedorId,
        valor: r.valor,
        vencimento: venc,
        parcela: 1,
        totalParcelas: 1,
        status: 'pendente',
        documento: '',
        origem: 'recorrencia',
        origemId: r.id,
        distribuicao: [{ centroId: SEDE, valor: r.valor }],
        criadoEm: `${venc}T00:00:00.000Z`,
      });
      ultima = monthKey(cursor);
      cursor = addMonths(cursor, 1);
    }
    return { ...r, ultimaGeracao: ultima };
  });
  return { novas, recorrencias: atualizadas };
}

// ---------------------------------------------------------------- status derivados

export function contaVencida(c: Pick<ContaPagar, 'status' | 'vencimento'>, hoje: ISODate): boolean {
  return c.status === 'pendente' && c.vencimento < hoje;
}
