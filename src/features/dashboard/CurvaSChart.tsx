import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { Card, Select, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useHoje, useResumo } from '@/hooks';
import { SEDE } from '@/domain/types';
import { addDays, diffDays } from '@/lib/dates';
import { fmtBRL, fmtBRLCompact, fmtDateShort } from '@/lib/format';

export function CurvaSChart() {
  const data = useData();
  const hoje = useHoje();
  const resumo = useResumo();

  const [obraSelecionadaId, setObraSelecionadaId] = useState<string>('todas');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'linha' | 'area'>('area');

  const obraSelecionada = data.obras.find((o) => o.id === obraSelecionadaId);

  // Geração dos pontos da Curva S
  const chartData = useMemo(() => {
    // Definir intervalo de datas
    let dataInicio: string;
    let dataFim: string;
    let orcamentoTotal = 0;

    if (obraSelecionada) {
      dataInicio = obraSelecionada.dataInicio;
      dataFim = obraSelecionada.previsaoEntrega;
      orcamentoTotal = obraSelecionada.orcamento;
    } else {
      // Consolidado de todas as obras
      const inicios = data.obras.map((o) => o.dataInicio).sort();
      const fins = data.obras.map((o) => o.previsaoEntrega).sort();
      dataInicio = inicios[0] || addDays(hoje, -90);
      dataFim = fins[fins.length - 1] || addDays(hoje, 90);
      orcamentoTotal = data.obras.reduce((s, o) => s + o.orcamento, 0);
    }

    const duracaoTotalDias = Math.max(30, diffDays(dataInicio, dataFim));
    const passoDias = Math.max(7, Math.round(duracaoTotalDias / 24)); // aprox. 20 a 25 pontos

    // Filtrar eventos de custo relevantes
    const eventosRelevantes = resumo.eventos.filter((e) => {
      if (obraSelecionadaId === 'todas') {
        return e.centroId !== SEDE; // apenas custos de obras
      }
      return e.centroId === obraSelecionadaId;
    });

    // Filtrar contas a pagar liquidadas
    const contasPagasRelevantes = data.contasPagar.filter((c) => {
      if (c.status !== 'pago' || !c.dataPagamento) return false;
      if (obraSelecionadaId === 'todas') {
        return c.distribuicao.some((d) => d.centroId !== SEDE);
      }
      return c.distribuicao.some((d) => d.centroId === obraSelecionadaId);
    });

    const pontos = [];
    let dataIter = dataInicio;

    // Gerar pontos da linha do tempo
    while (dataIter <= dataFim || dataIter <= hoje) {
      const diasPassados = Math.max(0, diffDays(dataInicio, dataIter));
      const progressoCronograma = Math.min(1, Math.max(0, diasPassados / duracaoTotalDias));

      // Curva S Teórica (função logística normalizada para 0 -> 1)
      // S(t) = 1 / (1 + exp(-10 * (t - 0.5)))
      // normalizada: (sigmoid - sigmoid(0)) / (sigmoid(1) - sigmoid(0))
      const k = 7;
      const t = progressoCronograma;
      const sig = (x: number) => 1 / (1 + Math.exp(-k * (x - 0.5)));
      const sMin = sig(0);
      const sMax = sig(1);
      const fatorS = Math.max(0, Math.min(1, (sig(t) - sMin) / (sMax - sMin)));
      const planejadoAcumulado = Math.round(orcamentoTotal * fatorS);

      // Comprometido acumulado até esta data (somente até a data atual 'hoje')
      let comprometidoAcumulado: number | null = null;
      let pagoAcumulado: number | null = null;

      if (dataIter <= hoje) {
        comprometidoAcumulado = eventosRelevantes
          .filter((e) => e.data <= dataIter)
          .reduce((s, e) => s + e.valor, 0);

        pagoAcumulado = contasPagasRelevantes
          .filter((c) => c.dataPagamento! <= dataIter)
          .reduce((s, c) => {
            const v =
              obraSelecionadaId === 'todas'
                ? c.distribuicao.filter((d) => d.centroId !== SEDE).reduce((acc, d) => acc + d.valor, 0)
                : c.distribuicao.find((d) => d.centroId === obraSelecionadaId)?.valor || 0;
            return s + v;
          }, 0);
      }

      pontos.push({
        data: dataIter,
        label: fmtDateShort(dataIter),
        planejado: planejadoAcumulado,
        comprometido: comprometidoAcumulado,
        pago: pagoAcumulado,
        isHoje: dataIter === hoje,
      });

      if (dataIter >= dataFim && dataIter >= hoje) break;
      dataIter = addDays(dataIter, passoDias);
    }

    return pontos;
  }, [data.obras, data.contasPagar, resumo.eventos, obraSelecionada, obraSelecionadaId, hoje]);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-fg">Curva S — Desembolso e Avanço Financeiro</h3>
            <Badge tone="orange">Recharts</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Comparativo acumulado: Planejado (Orçado) × Comprometido (Competência) × Realizado (Caixa)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={obraSelecionadaId} onChange={(e) => setObraSelecionadaId(e.target.value)}>
            <option value="todas">Todas as Obras (Consolidado)</option>
            {data.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs">
            <button
              onClick={() => setTipoVisualizacao('area')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                tipoVisualizacao === 'area' ? 'bg-surface font-semibold text-fg shadow-xs' : 'text-muted'
              }`}
            >
              Área
            </button>
            <button
              onClick={() => setTipoVisualizacao('linha')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                tipoVisualizacao === 'linha' ? 'bg-surface font-semibold text-fg shadow-xs' : 'text-muted'
              }`}
            >
              Linhas
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {tipoVisualizacao === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPlanejado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradComprometido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-line/60" vertical={false} />
              <XAxis dataKey="label" stroke="currentColor" className="text-muted text-xs" tickLine={false} />
              <YAxis
                stroke="currentColor"
                className="text-muted text-xs"
                tickFormatter={(v) => fmtBRLCompact(v)}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? fmtBRL(val) : '-', '']}
                labelFormatter={(lbl) => `Data: ${lbl}`}
                contentStyle={{
                  backgroundColor: 'var(--color-surface, #18222F)',
                  borderColor: 'var(--color-line, #243345)',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
              <Area
                type="monotone"
                dataKey="planejado"
                name="Planejado (Orçamento)"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#gradPlanejado)"
              />
              <Area
                type="monotone"
                dataKey="comprometido"
                name="Comprometido (Competência)"
                stroke="#FF6B00"
                strokeWidth={3}
                fill="url(#gradComprometido)"
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="pago"
                name="Realizado / Pago (Caixa)"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#gradPago)"
                connectNulls={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-line/60" vertical={false} />
              <XAxis dataKey="label" stroke="currentColor" className="text-muted text-xs" tickLine={false} />
              <YAxis
                stroke="currentColor"
                className="text-muted text-xs"
                tickFormatter={(v) => fmtBRLCompact(v)}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? fmtBRL(val) : '-', '']}
                labelFormatter={(lbl) => `Data: ${lbl}`}
                contentStyle={{
                  backgroundColor: 'var(--color-surface, #18222F)',
                  borderColor: 'var(--color-line, #243345)',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
              <Line
                type="monotone"
                dataKey="planejado"
                name="Planejado (Orçamento)"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="comprometido"
                name="Comprometido (Competência)"
                stroke="#FF6B00"
                strokeWidth={3}
                dot={{ r: 3, fill: '#FF6B00' }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="pago"
                name="Realizado / Pago (Caixa)"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10B981' }}
                connectNulls={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-3 text-xs text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
            <span>Planejado (Meta Físico-Financeira)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs bg-brand" />
            <span className="font-medium text-fg">Comprometido (Materiais + Folha + Máquinas)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs bg-emerald-500" />
            <span className="font-medium text-fg">Pago (Saídas de Caixa)</span>
          </span>
        </div>
        <div>
          <span>Hoje: </span>
          <span className="font-bold text-fg">{hoje}</span>
        </div>
      </div>
    </Card>
  );
}
