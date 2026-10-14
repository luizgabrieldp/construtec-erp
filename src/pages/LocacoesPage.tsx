import { useState } from 'react';
import { Plus, Construction, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button, PageHeader, Card, Badge } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import { useIsAdmin, useHoje } from '@/hooks';
import type { Locacao } from '@/domain/types';
import { LABEL_TARIFA } from '@/domain/labels';
import { custoLocacao, fimApuracao } from '@/domain/engine';
import { diffDays } from '@/lib/dates';
import { fmtBRL, fmtDate } from '@/lib/format';
import { LocacaoFormDialog } from '@/features/locacoes/LocacaoFormDialog';
import { ApontarHorasDialog } from '@/features/locacoes/ApontarHorasDialog';
import { DevolverLocacaoDialog } from '@/features/locacoes/DevolverLocacaoDialog';

export function LocacoesPage() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();

  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativas' | 'devolvidas'>('ativas');
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [locacaoHoras, setLocacaoHoras] = useState<Locacao | null>(null);
  const [devolverModal, setDevolverModal] = useState<{ locacao: Locacao; modo: 'devolver' | 'faturar' } | null>(null);

  const locacoesFiltradas = data.locacoes.filter((l) => {
    if (filtroStatus === 'ativas') return l.status === 'ativa';
    if (filtroStatus === 'devolvidas') return l.status === 'devolvida';
    return l.status !== 'cancelada';
  });

  const maquinasAtivasQtd = data.locacoes
    .filter((l) => l.status === 'ativa' && l.dataRetirada <= hoje && (!l.dataDevolucao || l.dataDevolucao >= hoje))
    .reduce((s, l) => s + l.quantidade, 0);

  const custoTotalAcumulado = data.locacoes
    .filter((l) => l.status !== 'cancelada')
    .reduce((s, l) => s + custoLocacao(l, hoje), 0);

  const totalJaFaturado = data.locacoes
    .filter((l) => l.status !== 'cancelada')
    .reduce((s, l) => s + l.valorFaturado, 0);

  return (
    <>
      <PageHeader
        title="Aluguel de Máquinas & Equipamentos"
        subtitle="Controle de maquinário locado por obra, custo acumulado e geração de faturamento"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModalNovoOpen(true)}>
            Nova Locação
          </Button>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Equipamentos em Operação"
          value={`${maquinasAtivasQtd} unidades`}
          hint="Betoneiras, retroescavadeiras, andaimes ativos"
          icon={<Construction className="size-5" />}
          tone="brand"
        />
        <StatCard
          label="Custo Acumulado em Obras"
          value={fmtBRL(custoTotalAcumulado)}
          hint="Calculado proporcionalmente até hoje"
          icon={<Clock className="size-5" />}
          tone="blue"
        />
        <StatCard
          label="Faturado em Contas a Pagar"
          value={fmtBRL(totalJaFaturado)}
          hint={`Pendente de fatura: ${fmtBRL(Math.max(0, custoTotalAcumulado - totalJaFaturado))}`}
          icon={<CheckCircle2 className="size-5" />}
          tone="green"
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        {(['ativas', 'devolvidas', 'todos'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFiltroStatus(st)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filtroStatus === st
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            {st === 'todos' ? 'Todos os Registros' : st}
          </button>
        ))}
      </div>

      {/* Tabela de Locações */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Equipamento</th>
                <th className="px-4 py-3">Obra Alocada</th>
                <th className="px-4 py-3">Fornecedor / Locador</th>
                <th className="px-4 py-3">Tarifa / Período</th>
                <th className="px-4 py-3 text-right">Custo Acumulado</th>
                <th className="px-4 py-3 text-right">Faturado</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {locacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-xs">
                    Nenhuma locação encontrada no filtro selecionado.
                  </td>
                </tr>
              ) : (
                locacoesFiltradas.map((loc) => {
                  const obra = data.obras.find((o) => o.id === loc.obraId);
                  const forn = data.fornecedores.find((f) => f.id === loc.fornecedorId);
                  const custo = custoLocacao(loc, hoje);
                  const saldoFaturar = Math.max(0, custo - loc.valorFaturado);
                  const diasEmUso = diffDays(loc.dataRetirada, fimApuracao(loc, hoje)) + 1;

                  return (
                    <tr key={loc.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-fg flex items-center gap-2">
                          {loc.equipamento}
                          {loc.quantidade > 1 && (
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted">
                              x{loc.quantidade}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                          <Badge tone={loc.status === 'ativa' ? 'green' : 'neutral'}>
                            {loc.status === 'ativa' ? 'Em operação' : 'Devolvido'}
                          </Badge>
                          <span>Desde {fmtDate(loc.dataRetirada)} ({diasEmUso}d)</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-fg">{obra?.nome || 'Obra não identificada'}</div>
                        <div className="text-[11px] text-muted">{obra?.responsavel}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-fg">{forn?.nome || '—'}</div>
                        <div className="text-[11px] text-muted">{forn?.telefone}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-fg">
                          {fmtBRL(loc.valor)} <span className="text-xs text-muted">/ {LABEL_TARIFA[loc.tarifa]}</span>
                        </div>
                        {loc.tarifa === 'hora' && (
                          <div className="text-[11px] text-brand font-semibold">
                            {loc.horas.reduce((s, h) => s + h.horas, 0)}h apontadas
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                        {fmtBRL(custo)}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <div className="font-semibold text-emerald-500">{fmtBRL(loc.valorFaturado)}</div>
                        {saldoFaturar > 0 && (
                          <div className="text-[10px] text-amber-500 font-medium">
                            +{fmtBRL(saldoFaturar)} a faturar
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {loc.tarifa === 'hora' && loc.status === 'ativa' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Clock className="size-3" />}
                              onClick={() => setLocacaoHoras(loc)}
                              title="Apontar Horas"
                            >
                              Horas
                            </Button>
                          )}

                          {loc.status === 'ativa' && (
                            <>
                              {isAdmin && saldoFaturar > 0 && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setDevolverModal({ locacao: loc, modo: 'faturar' })}
                                  title="Faturar Medição Parcial"
                                >
                                  Faturar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<RotateCcw className="size-3" />}
                                onClick={() => setDevolverModal({ locacao: loc, modo: 'devolver' })}
                                title="Registrar Devolução"
                              >
                                Devolver
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modais */}
      <LocacaoFormDialog
        open={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
      />
      <ApontarHorasDialog
        locacao={locacaoHoras}
        onClose={() => setLocacaoHoras(null)}
      />
      <DevolverLocacaoDialog
        locacao={devolverModal?.locacao || null}
        modo={devolverModal?.modo || 'devolver'}
        onClose={() => setDevolverModal(null)}
      />
    </>
  );
}
