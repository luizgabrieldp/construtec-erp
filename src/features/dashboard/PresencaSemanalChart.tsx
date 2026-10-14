import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useHoje } from '@/hooks';
import { SEDE } from '@/domain/types';
import { chaveApontamento, FATOR_PRESENCA } from '@/domain/engine';
import { addDays, eachDay, startOfWeek } from '@/lib/dates';
import { fmtDateShort } from '@/lib/format';

const DIAS_NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function PresencaSemanalChart() {
  const data = useData();
  const hoje = useHoje();

  const semanaInicio = startOfWeek(hoje);
  const diasSemana = eachDay(semanaInicio, addDays(semanaInicio, 6)); // Seg a Dom (7 dias)

  const dadosGrafico = useMemo(() => {
    return diasSemana.map((dia, idx) => {
      let presentes = 0;
      let faltas = 0;

      data.funcionarios.forEach((f) => {
        if (!f.ativo) return;
        const k = chaveApontamento(f.id, dia);
        const ap = data.apontamentos[k];
        if (ap) {
          if (ap.status === 'inteiro') presentes += 1;
          else if (ap.status === 'meio') presentes += 0.5;
          else if (ap.status === 'falta' && dia <= hoje) faltas += 1;
        }
      });

      return {
        dia: DIAS_NOMES[idx],
        dataStr: fmtDateShort(dia),
        diaCompleto: dia,
        presentes,
        faltas,
        isHoje: dia === hoje,
      };
    });
  }, [data.funcionarios, data.apontamentos, diasSemana, hoje]);

  // Distribuição da equipe por obra no dia de hoje
  const distribuicaoObrasHoje = useMemo(() => {
    const contagem: Record<string, { nome: string; cor: string; count: number }> = {};

    data.obras.forEach((o) => {
      contagem[o.id] = { nome: o.nome, cor: o.cor, count: 0 };
    });
    contagem[SEDE] = { nome: 'Sede / Matriz', cor: '#64748B', count: 0 };

    data.funcionarios.forEach((f) => {
      if (!f.ativo) return;
      const k = chaveApontamento(f.id, hoje);
      const ap = data.apontamentos[k];
      if (ap && ap.status !== 'falta') {
        const centros = ap.centroIds && ap.centroIds.length > 0 ? ap.centroIds : [ap.centroId];
        centros.forEach((c) => {
          if (contagem[c]) contagem[c].count += 1;
        });
      }
    });

    return Object.values(contagem).filter((item) => item.count > 0);
  }, [data.obras, data.funcionarios, data.apontamentos, hoje]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Gráfico de Presença Semanal */}
      <Card className="lg:col-span-2">
        <CardHeader
          title="Frequência da Equipe na Semana (Segunda a Domingo)"
          subtitle={`Acompanhamento de presença e ausências de ${fmtDateShort(semanaInicio)} a ${fmtDateShort(addDays(semanaInicio, 6))}`}
        />
        <div className="p-5 pt-0">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={{ opacity: 0.2 }}
                  tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.8 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ opacity: 0.2 }}
                  tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.8 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-line bg-surface p-3 shadow-lg text-xs">
                        <div className="font-bold text-fg mb-1">
                          {item.dia} ({item.dataStr}) {item.isHoje && '• Hoje'}
                        </div>
                        <div className="text-emerald-500 font-semibold flex items-center justify-between gap-3">
                          <span>Presentes em campo:</span>
                          <strong>{item.presentes}</strong>
                        </div>
                        <div className="text-red-500 font-semibold flex items-center justify-between gap-3">
                          <span>Faltas registradas:</span>
                          <strong>{item.faltas}</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />
                <Bar dataKey="presentes" name="Presentes" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="faltas" name="Faltas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Alocação da Equipe por Obra Hoje */}
      <Card>
        <CardHeader
          title="Equipe em Campo Hoje"
          subtitle="Distribuição dos colaboradores por obra"
        />
        <div className="p-5 pt-0 space-y-3">
          {distribuicaoObrasHoje.length === 0 ? (
            <p className="text-xs text-muted italic">Nenhum colaborador apontado em obras hoje.</p>
          ) : (
            distribuicaoObrasHoje.map((item) => (
              <div
                key={item.nome}
                className="flex items-center justify-between rounded-xl border border-line bg-surface-2/40 p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                  <span className="font-semibold text-fg">{item.nome}</span>
                </div>
                <Badge tone="blue">
                  {item.count} {item.count === 1 ? 'operário' : 'operários'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
