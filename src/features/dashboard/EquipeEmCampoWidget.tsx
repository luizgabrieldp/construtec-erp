import { useMemo } from 'react';
import { HardHat } from 'lucide-react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useHoje } from '@/hooks';
import { SEDE } from '@/domain/types';
import { chaveApontamento } from '@/domain/engine';

export function EquipeEmCampoWidget() {
  const data = useData();
  const hoje = useHoje();

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
    <Card className="h-full flex flex-col">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <HardHat className="size-4 text-emerald-500" />
            <span>Equipe em Campo Hoje</span>
          </div>
        }
        subtitle="Distribuição dos colaboradores por obra"
      />
      <div className="p-5 pt-3 space-y-3 flex-1">
        {distribuicaoObrasHoje.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line p-4 text-center">
            <HardHat className="size-8 text-muted/40 mb-2" />
            <p className="text-xs text-muted">Nenhum colaborador apontado em obras hoje.</p>
          </div>
        ) : (
          distribuicaoObrasHoje.map((item) => (
            <div
              key={item.nome}
              className="flex items-center justify-between rounded-xl border border-line bg-surface-2/40 p-3 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
                <span className="font-semibold text-fg truncate">{item.nome}</span>
              </div>
              <Badge tone="blue" className="shrink-0">
                {item.count} {item.count === 1 ? 'operário' : 'operários'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
