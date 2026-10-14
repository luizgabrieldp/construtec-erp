/**
 * Seletores derivados (somente leitura). Tudo o que é "calculado" sai daqui,
 * para que telas, relatórios e Modo TV mostrem exatamente os mesmos números.
 */
import type { CategoriaGasto, CentroId, ErpData, ID, ISODate } from './types';
import { SEDE } from './types';
import { FATOR_PRESENCA, chaveApontamento, contaVencida, custoLocacao, valorDia } from './engine';
import { addDays, eachDay, endOfMonth, isBetween, startOfMonth } from '@/lib/dates';
import { round2 } from '@/lib/format';

// ---------------------------------------------------------------- eventos de custo (competência)

export type GrupoCusto = 'materiais' | 'mao_de_obra' | 'locacao' | 'servicos' | 'outros';

export interface EventoCusto {
  data: ISODate;
  centroId: CentroId;
  grupo: GrupoCusto;
  categoria: CategoriaGasto;
  valor: number;
}

export interface SaldoEstoque {
  quantidade: number;
  valor: number; // valor em estoque (custo médio × quantidade)
}

/** local -> materialId -> saldo */
export type MapaEstoque = Record<CentroId, Record<ID, SaldoEstoque>>;

interface EventoEstoque {
  data: ISODate;
  ordem: number; // entradas antes das saídas no mesmo dia
  aplicar: () => void;
}

/**
 * Reprocessa o estoque em ordem cronológica (custo médio ponderado por local)
 * e devolve os eventos de custo de materiais por centro de custo.
 */
export function processarEstoque(data: ErpData, ate?: ISODate) {
  const estoque: MapaEstoque = {};
  const custos: EventoCusto[] = [];
  const saldo = (local: CentroId, mat: ID) => {
    estoque[local] ??= {};
    return (estoque[local][mat] ??= { quantidade: 0, valor: 0 });
  };
  const medio = (s: SaldoEstoque) => (s.quantidade > 0 ? s.valor / s.quantidade : 0);
  const custo = (data: ISODate, centroId: CentroId, valor: number) =>
    valor !== 0 && custos.push({ data, centroId, grupo: 'materiais', categoria: 'materiais', valor: round2(valor) });

  const eventos: EventoEstoque[] = [];
  for (const c of data.compras) {
    if (c.status !== 'ativa') continue;
    for (const dest of c.destinos) {
      for (const item of c.itens) {
        const q = dest.quantidades[item.id] ?? 0;
        if (q <= 0) continue;
        eventos.push({
          data: c.data,
          ordem: 0,
          aplicar: () => {
            const s = saldo(dest.centroId, item.materialId);
            s.quantidade += q;
            s.valor += q * item.valorUnitario;
            custo(c.data, dest.centroId, q * item.valorUnitario);
          },
        });
      }
    }
  }
  for (const m of data.movimentos) {
    eventos.push({
      data: m.data,
      ordem: m.tipo === 'transferencia' ? 1 : 2,
      aplicar: () => {
        const s = saldo(m.local, m.materialId);
        if (m.tipo === 'saida') {
          const q = Math.min(m.quantidade, s.quantidade);
          s.valor -= q * medio(s);
          s.quantidade -= q;
        } else if (m.tipo === 'transferencia' && m.destino) {
          const q = Math.min(m.quantidade, s.quantidade);
          const v = q * medio(s);
          s.quantidade -= q;
          s.valor -= v;
          const d = saldo(m.destino, m.materialId);
          d.quantidade += q;
          d.valor += v;
          custo(m.data, m.local, -v);
          custo(m.data, m.destino, v);
        } else if (m.tipo === 'ajuste') {
          if (m.quantidade >= 0) s.quantidade += m.quantidade;
          else {
            const q = Math.min(-m.quantidade, s.quantidade);
            s.valor -= q * medio(s);
            s.quantidade -= q;
          }
        }
      },
    });
  }
  eventos
    .filter((e) => !ate || e.data <= ate)
    .sort((a, b) => (a.data === b.data ? a.ordem - b.ordem : a.data < b.data ? -1 : 1))
    .forEach((e) => e.aplicar());

  for (const local of Object.values(estoque))
    for (const s of Object.values(local)) {
      s.quantidade = round2(s.quantidade);
      s.valor = round2(Math.max(0, s.valor));
    }
  return { estoque, custos };
}

/** Eventos de custo de locação, dia a dia (ou por apontamento de horas). */
function custosLocacao(data: ErpData, hoje: ISODate): EventoCusto[] {
  const out: EventoCusto[] = [];
  for (const l of data.locacoes) {
    if (l.status === 'cancelada') continue;
    const base = { centroId: l.obraId, grupo: 'locacao' as const, categoria: 'locacao' as const };
    if (l.tarifa === 'hora') {
      l.horas.filter((h) => h.data <= hoje).forEach((h) => out.push({ ...base, data: h.data, valor: h.horas * l.valor }));
    } else {
      const fim = l.dataDevolucao && l.dataDevolucao < hoje ? l.dataDevolucao : hoje;
      const porDia = l.tarifa === 'diaria' ? l.valor * l.quantidade : (l.valor * l.quantidade) / 30;
      if (fim >= l.dataRetirada) eachDay(l.dataRetirada, fim).forEach((dia) => out.push({ ...base, data: dia, valor: porDia }));
    }
  }
  return out;
}

/**
 * Mão de obra: períodos FECHADOS usam a distribuição do fechamento, espalhada pelos dias apontados;
 * dias ainda não fechados entram como estimativa (valor do dia × fator de presença).
 */
function custosMaoDeObra(data: ErpData, hoje: ISODate): EventoCusto[] {
  const out: EventoCusto[] = [];
  const funcs = Object.fromEntries(data.funcionarios.map((f) => [f.id, f]));
  const cobertos = new Set<string>();

  for (const fe of data.fechamentos) {
    if (fe.status !== 'fechado') continue;
    const diasPorCentro: Record<CentroId, ISODate[]> = {};
    const fatores: Record<string, number> = {};
    for (const dia of eachDay(fe.inicio, fe.fim)) {
      const k = chaveApontamento(fe.funcionarioId, dia);
      cobertos.add(k);
      const a = data.apontamentos[k];
      if (!a || !FATOR_PRESENCA[a.status]) continue;
      const centros = a.centroIds && a.centroIds.length > 0 ? a.centroIds : [a.centroId];
      const fatorCentro = FATOR_PRESENCA[a.status] / centros.length;
      for (const cid of centros) {
        (diasPorCentro[cid] ??= []).push(dia);
        fatores[`${cid}|${dia}`] = (fatores[`${cid}|${dia}`] ?? 0) + fatorCentro;
      }
    }
    for (const dist of fe.distribuicao) {
      const dias = diasPorCentro[dist.centroId] ?? [];
      const somaFatores = dias.reduce((s, d) => s + (fatores[`${dist.centroId}|${d}`] ?? 0), 0);
      if (!dias.length || somaFatores === 0) {
        out.push({ data: fe.fim, centroId: dist.centroId, grupo: 'mao_de_obra', categoria: 'mao_de_obra', valor: dist.valor });
        continue;
      }
      for (const d of dias)
        out.push({
          data: d,
          centroId: dist.centroId,
          grupo: 'mao_de_obra',
          categoria: 'mao_de_obra',
          valor: (dist.valor * (fatores[`${dist.centroId}|${d}`] ?? 0)) / somaFatores,
        });
    }
  }

  for (const [k, a] of Object.entries(data.apontamentos)) {
    if (cobertos.has(k) || a.data > hoje) continue;
    const f = funcs[a.funcionarioId];
    const fator = FATOR_PRESENCA[a.status];
    if (!f || !fator) continue;
    const centros = a.centroIds && a.centroIds.length > 0 ? a.centroIds : [a.centroId];
    const valorPorCentro = round2((valorDia(f, a.data) * fator) / centros.length);
    for (const cid of centros) {
      out.push({ data: a.data, centroId: cid, grupo: 'mao_de_obra', categoria: 'mao_de_obra', valor: valorPorCentro });
    }
  }
  return out;
}

function custosServicosEmpreitada(data: ErpData): EventoCusto[] {
  const out: EventoCusto[] = [];
  if (!data.servicos) return out;
  for (const s of data.servicos) {
    if (s.status === 'cancelado') continue;
    out.push({
      data: s.dataInicio,
      centroId: s.obraId,
      grupo: 'servicos',
      categoria: 'servicos',
      valor: s.valorTotal,
    });
  }
  return out;
}

/** Contas que representam custo por si só (despesas avulsas, recorrências, lançamentos manuais). */
function custosContasDiretas(data: ErpData): EventoCusto[] {
  const out: EventoCusto[] = [];
  for (const c of data.contasPagar) {
    if (c.status === 'cancelado') continue;
    if (c.origem !== 'despesa' && c.origem !== 'recorrencia' && c.origem !== 'manual') continue;
    const grupo: GrupoCusto =
      c.categoria === 'materiais'
        ? 'materiais'
        : c.categoria === 'mao_de_obra'
        ? 'mao_de_obra'
        : c.categoria === 'locacao'
        ? 'locacao'
        : c.categoria === 'servicos'
        ? 'servicos'
        : 'outros';
    for (const d of c.distribuicao)
      out.push({ data: c.dataPagamento ?? c.vencimento, centroId: d.centroId, grupo, categoria: c.categoria, valor: d.valor });
  }
  return out;
}

export function eventosCusto(data: ErpData, hoje: ISODate): EventoCusto[] {
  return [
    ...processarEstoque(data).custos,
    ...custosLocacao(data, hoje),
    ...custosMaoDeObra(data, hoje),
    ...custosServicosEmpreitada(data),
    ...custosContasDiretas(data),
  ];
}

// ---------------------------------------------------------------- resumo geral

export interface ResumoObra {
  obraId: ID;
  comprometido: number;
  pago: number;
  orcamento: number;
  saldoOrcamento: number;
  consumoPct: number;
  porGrupo: Record<GrupoCusto, number>;
  equipeHoje: number;
  maquinasAtivas: number;
}

export interface Resumo {
  hoje: ISODate;
  saldoCaixa: number;
  entradasMes: number;
  saidasMes: number;
  comprometidoObrasAtivas: number;
  custoSede: number;
  aVencer7d: { total: number; quantidade: number };
  vencidas: { total: number; quantidade: number };
  aReceberVencido: { total: number; quantidade: number };
  equipeHoje: number;
  maquinasAtivas: number;
  composicao: Record<GrupoCusto, number>;
  porObra: Record<ID, ResumoObra>;
  eventos: EventoCusto[];
}

const grupoVazio = (): Record<GrupoCusto, number> => ({ materiais: 0, mao_de_obra: 0, locacao: 0, servicos: 0, outros: 0 });

export function maquinaEmOperacao(l: ErpData['locacoes'][number], hoje: ISODate) {
  return l.status === 'ativa' && l.dataRetirada <= hoje && (!l.dataDevolucao || l.dataDevolucao >= hoje);
}

export function calcularResumo(data: ErpData, hoje: ISODate): Resumo {
  const eventos = eventosCusto(data, hoje);
  const iniMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const em7 = addDays(hoje, 7);

  const porObra: Record<ID, ResumoObra> = {};
  for (const o of data.obras) {
    porObra[o.id] = {
      obraId: o.id,
      comprometido: 0,
      pago: 0,
      orcamento: o.orcamento,
      saldoOrcamento: 0,
      consumoPct: 0,
      porGrupo: grupoVazio(),
      equipeHoje: 0,
      maquinasAtivas: 0,
    };
  }

  const composicao = grupoVazio();
  let custoSede = 0;
  for (const e of eventos) {
    composicao[e.grupo] += e.valor;
    if (e.centroId === SEDE) custoSede += e.valor;
    const r = porObra[e.centroId];
    if (r) {
      r.comprometido += e.valor;
      r.porGrupo[e.grupo] += e.valor;
    }
  }

  // caixa
  let saldoCaixa = data.config.saldoInicial;
  let entradasMes = 0;
  let saidasMes = 0;
  const aVencer7d = { total: 0, quantidade: 0 };
  const vencidas = { total: 0, quantidade: 0 };
  for (const c of data.contasPagar) {
    if (c.status === 'pago' && c.dataPagamento) {
      saldoCaixa -= c.valor;
      if (isBetween(c.dataPagamento, iniMes, fimMes)) saidasMes += c.valor;
      for (const d of c.distribuicao) if (porObra[d.centroId]) porObra[d.centroId].pago += d.valor;
    } else if (c.status === 'pendente') {
      if (contaVencida(c, hoje)) {
        vencidas.total += c.valor;
        vencidas.quantidade++;
      } else if (c.vencimento <= em7) {
        aVencer7d.total += c.valor;
        aVencer7d.quantidade++;
      }
    }
  }
  const aReceberVencido = { total: 0, quantidade: 0 };
  for (const r of data.contasReceber) {
    if (r.status === 'recebido' && r.dataRecebimento) {
      saldoCaixa += r.valor;
      if (isBetween(r.dataRecebimento, iniMes, fimMes)) entradasMes += r.valor;
    } else if (r.status === 'pendente' && r.vencimento < hoje) {
      aReceberVencido.total += r.valor;
      aReceberVencido.quantidade++;
    }
  }

  // campo
  let equipeHoje = 0;
  for (const f of data.funcionarios) {
    const a = data.apontamentos[chaveApontamento(f.id, hoje)];
    if (!a || a.status === 'falta') continue;
    equipeHoje++;
    const centros = Array.from(new Set(a.centroIds && a.centroIds.length > 0 ? a.centroIds : [a.centroId]));
    for (const cid of centros) {
      if (porObra[cid]) porObra[cid].equipeHoje++;
    }
  }
  let maquinasAtivas = 0;
  for (const l of data.locacoes) {
    if (!maquinaEmOperacao(l, hoje)) continue;
    maquinasAtivas += l.quantidade;
    if (porObra[l.obraId]) porObra[l.obraId].maquinasAtivas += l.quantidade;
  }

  let comprometidoObrasAtivas = 0;
  for (const o of data.obras) {
    const r = porObra[o.id];
    r.comprometido = round2(r.comprometido);
    r.pago = round2(r.pago);
    r.saldoOrcamento = round2(r.orcamento - r.comprometido);
    r.consumoPct = r.orcamento > 0 ? r.comprometido / r.orcamento : 0;
    (Object.keys(r.porGrupo) as GrupoCusto[]).forEach((g) => (r.porGrupo[g] = round2(r.porGrupo[g])));
    if (o.status === 'andamento' || o.status === 'pausada') comprometidoObrasAtivas += r.comprometido;
  }
  (Object.keys(composicao) as GrupoCusto[]).forEach((g) => (composicao[g] = round2(composicao[g])));

  return {
    hoje,
    saldoCaixa: round2(saldoCaixa),
    entradasMes: round2(entradasMes),
    saidasMes: round2(saidasMes),
    comprometidoObrasAtivas: round2(comprometidoObrasAtivas),
    custoSede: round2(custoSede),
    aVencer7d: { ...aVencer7d, total: round2(aVencer7d.total) },
    vencidas: { ...vencidas, total: round2(vencidas.total) },
    aReceberVencido: { ...aReceberVencido, total: round2(aReceberVencido.total) },
    equipeHoje,
    maquinasAtivas,
    composicao,
    porObra,
    eventos,
  };
}

/** Custo acumulado atual de uma locação (atalho para telas). */
export const custoAtualLocacao = custoLocacao;
