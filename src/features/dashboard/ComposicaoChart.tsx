import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useResumo } from '@/hooks';
import type { GrupoCusto } from '@/domain/selectors';
import { fmtBRL, fmtBRLCompact, fmtPct } from '@/lib/format';

const CORES_GRUPOS: Record<GrupoCusto, string> = {
  materiais: '#FF6B00',
  mao_de_obra: '#38BDF8',
  locacao: '#A78BFA',
  servicos: '#10B981',
  outros: '#64748B',
};

const LABELS_GRUPOS: Record<GrupoCusto, string> = {
  materiais: 'Materiais (Estoque/Compras)',
  mao_de_obra: 'Mão de Obra (Diárias/Salários)',
  locacao: 'Locação de Máquinas',
  servicos: 'Serviços & Empreitadas',
  outros: 'Despesas Gerais / Sede',
};

export function ComposicaoChart() {
  const data = useData();
  const resumo = useResumo();
  const [visao, setVisao] = useState<'donut' | 'barras'>('donut');

  // Dados para o Donut
  const donutData = useMemo(() => {
    const total = Object.values(resumo.composicao).reduce((s, v) => s + v, 0) || 1;
    return (Object.entries(resumo.composicao) as [GrupoCusto, number][]).map(([k, v]) => ({
      name: LABELS_GRUPOS[k],
      value: v,
      pct: v / total,
      color: CORES_GRUPOS[k],
    }));
  }, [resumo.composicao]);

  // Dados para Barras Empilhadas por Obra
  const barData = useMemo(() => {
    return data.obras.map((o) => {
      const ro = resumo.porObra[o.id];
      return {
        name: o.nome,
        materiais: ro ? ro.porGrupo.materiais : 0,
        mao_de_obra: ro ? ro.porGrupo.mao_de_obra : 0,
        locacao: ro ? ro.porGrupo.locacao : 0,
        servicos: ro ? ro.porGrupo.servicos : 0,
        outros: ro ? ro.porGrupo.outros : 0,
        total: ro ? ro.comprometido : 0,
      };
    });
  }, [data.obras, resumo.porObra]);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-fg">Composição Detalhada de Custos</h3>
            <Badge tone="blue">Recharts</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Distribuição por materiais, equipe de campo e máquinas alugadas
          </p>
        </div>

        <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs">
          <button
            onClick={() => setVisao('donut')}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              visao === 'donut' ? 'bg-surface font-semibold text-fg shadow-xs' : 'text-muted'
            }`}
          >
            Geral (Donut)
          </button>
          <button
            onClick={() => setVisao('barras')}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              visao === 'barras' ? 'bg-surface font-semibold text-fg shadow-xs' : 'text-muted'
            }`}
          >
            Por Obra (Barras)
          </button>
        </div>
      </div>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {visao === 'donut' ? (
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? fmtBRL(val) : '-', '']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface, #18222F)',
                  borderColor: 'var(--color-line, #243345)',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                }}
              />
            </PieChart>
          ) : (
            <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-line/60" vertical={false} />
              <XAxis dataKey="name" stroke="currentColor" className="text-muted text-xs" tickLine={false} />
              <YAxis
                stroke="currentColor"
                className="text-muted text-xs"
                tickFormatter={(v) => fmtBRLCompact(v)}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val: any) => [typeof val === 'number' ? fmtBRL(val) : '-', '']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface, #18222F)',
                  borderColor: 'var(--color-line, #243345)',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Bar dataKey="materiais" name="Materiais" stackId="a" fill={CORES_GRUPOS.materiais} radius={[0, 0, 0, 0]} />
              <Bar dataKey="mao_de_obra" name="Mão de Obra" stackId="a" fill={CORES_GRUPOS.mao_de_obra} radius={[0, 0, 0, 0]} />
              <Bar dataKey="locacao" name="Locação Máquinas" stackId="a" fill={CORES_GRUPOS.locacao} radius={[0, 0, 0, 0]} />
              <Bar dataKey="servicos" name="Serviços / Empreitadas" stackId="a" fill={CORES_GRUPOS.servicos} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Lista detalhada com barras de progresso — sem sobreposição */}
      <div className="mt-4 space-y-2.5 border-t border-line pt-3.5">
        {donutData.map((d) => (
          <div key={d.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-fg truncate pr-2">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.name}</span>
              </span>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-xs sm:text-sm font-bold tabular-nums text-fg">{fmtBRL(d.value)}</span>
                <span className="text-[11px] font-semibold text-muted w-10 text-right">{fmtPct(d.pct)}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, d.pct * 100)}%`, background: d.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
