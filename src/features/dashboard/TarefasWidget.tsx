import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  ArrowRight,
  Clock,
  Sun,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Circle,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button } from '@/components/ui';
import { useErp, useData } from '@/data/store';
import { useHoje } from '@/hooks';
import type { Tarefa } from '@/domain/types';
import { LABEL_RECORRENCIA_TAREFA } from '@/domain/labels';
import { startOfWeek, addDays } from '@/lib/dates';
import { fmtDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { TarefaFormDialog } from '@/features/tarefas/TarefaFormDialog';

export function TarefasWidget() {
  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const hoje = useHoje();

  const [tab, setTab] = useState<'dia' | 'semana'>('dia');
  const [formOpen, setFormOpen] = useState(false);
  const [tarefaParaEditar, setTarefaParaEditar] = useState<Tarefa | null>(null);

  const semanaInicio = startOfWeek(hoje);
  const semanaFim = addDays(semanaInicio, 6);

  // Mapeamento de obras para lookup rápido
  const obrasMap = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string }>();
    data.obras.forEach((o) => map.set(o.id, { nome: o.nome, cor: o.cor }));
    return map;
  }, [data.obras]);

  // Tarefas atrasadas pendentes (anteriores a hoje)
  const tarefasAtrasadas = useMemo(() => {
    return data.tarefas
      .filter((t) => !t.concluida && t.data < hoje)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [data.tarefas, hoje]);

  // Tarefas do dia
  const tarefasDoDia = useMemo(() => {
    return data.tarefas
      .filter((t) => t.data === hoje)
      .sort((a, b) => {
        // Pendentes primeiro
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        // Prioridade alta primeiro
        const pesoPrio = { alta: 3, media: 2, baixa: 1 };
        const pA = pesoPrio[a.prioridade || 'media'];
        const pB = pesoPrio[b.prioridade || 'media'];
        if (pA !== pB) return pB - pA;
        return a.titulo.localeCompare(b.titulo);
      });
  }, [data.tarefas, hoje]);

  // Tarefas da semana
  const tarefasDaSemana = useMemo(() => {
    return data.tarefas
      .filter((t) => t.data >= semanaInicio && t.data <= semanaFim)
      .sort((a, b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        const pesoPrio = { alta: 3, media: 2, baixa: 1 };
        const pA = pesoPrio[a.prioridade || 'media'];
        const pB = pesoPrio[b.prioridade || 'media'];
        return pB - pA;
      });
  }, [data.tarefas, semanaInicio, semanaFim]);

  const tarefasExibidas = tab === 'dia' ? tarefasDoDia : tarefasDaSemana;
  const pendentesDiaCount = tarefasDoDia.filter((t) => !t.concluida).length;
  const pendentesSemanaCount = tarefasDaSemana.filter((t) => !t.concluida).length;

  const toggleConcluida = (t: Tarefa, e: React.MouseEvent) => {
    e.stopPropagation();
    const novoStatus = !t.concluida;
    mutate(
      (d) => {
        const item = d.tarefas.find((x) => x.id === t.id);
        if (item) {
          item.concluida = novoStatus;
          item.concluidaEm = novoStatus ? new Date().toISOString() : undefined;
        }
      },
      {
        acao: 'Tarefas',
        descricao: `${novoStatus ? 'Concluiu' : 'Reabriu'} tarefa: ${t.titulo}`,
      },
    );
  };

  const abrirEdicao = (t: Tarefa) => {
    setTarefaParaEditar(t);
    setFormOpen(true);
  };

  const abrirNova = () => {
    setTarefaParaEditar(null);
    setFormOpen(true);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-brand" />
              <span>Tarefas & Lembretes</span>
            </div>
          }
          subtitle="Acompanhamento operacional e pendências da equipe"
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={abrirNova}>
                Nova Tarefa
              </Button>
              <Link
                to="/tarefas"
                className="hidden sm:flex items-center gap-1 text-xs font-semibold text-brand hover:underline ml-1"
              >
                <span>Ver todas</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          }
        />

        {/* Seção Fixa e Destacada para Tarefas Atrasadas */}
        {tarefasAtrasadas.length > 0 && (
          <div className="mx-5 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-red-500 shrink-0" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Tarefas Atrasadas
                </span>
              </div>
              <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5">
                {tarefasAtrasadas.length} {tarefasAtrasadas.length === 1 ? 'pendência' : 'pendências'}
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {tarefasAtrasadas.map((t) => (
                <div
                  key={t.id}
                  onClick={() => abrirEdicao(t)}
                  className="group flex items-center justify-between gap-2 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs border border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => toggleConcluida(t, e)}
                      className="text-muted hover:text-emerald-500 shrink-0 cursor-pointer"
                      title="Concluir rapidamente"
                    >
                      <Circle className="size-3.5" />
                    </button>
                    <span className="truncate font-medium text-fg">{t.titulo}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                    {fmtDateShort(t.data)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abas do Widget */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <button
              type="button"
              onClick={() => setTab('dia')}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                tab === 'dia'
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:text-fg hover:bg-surface-2',
              )}
            >
              <span>Tarefas do Dia</span>
              {pendentesDiaCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-brand text-[10px] text-white">
                  {pendentesDiaCount}
                </span>
              ) : (
                <span className="text-[11px] text-muted">({tarefasDoDia.length})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('semana')}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                tab === 'semana'
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:text-fg hover:bg-surface-2',
              )}
            >
              <span>Tarefas da Semana</span>
              {pendentesSemanaCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-surface-2 border border-line text-[10px] text-fg font-bold">
                  {pendentesSemanaCount}
                </span>
              ) : (
                <span className="text-[11px] text-muted">({tarefasDaSemana.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div className="p-5 pt-3 flex-1 flex flex-col justify-between">
          {tarefasExibidas.length === 0 ? (
            <div className="flex flex-1 min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-line p-6 text-center">
              <CheckCircle2 className="size-8 text-emerald-500/50 mb-2" />
              <p className="text-sm font-semibold text-fg">Tudo em dia!</p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                {tab === 'dia'
                  ? 'Nenhuma tarefa ou pendência pendente para hoje.'
                  : 'Nenhuma tarefa programada para esta semana.'}
              </p>
              <Button size="sm" variant="ghost" className="mt-3 text-brand" onClick={abrirNova}>
                + Criar primeira tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tarefasExibidas.slice(0, 5).map((t) => {
                const obra = t.obraId ? obrasMap.get(t.obraId) : null;
                const atrasada = !t.concluida && t.data < hoje;
                const isHoje = t.data === hoje;

                return (
                  <div
                    key={t.id}
                    onClick={() => abrirEdicao(t)}
                    className={cn(
                      'group flex items-start gap-3 rounded-xl border border-line p-3 transition-colors cursor-pointer',
                      t.concluida
                        ? 'bg-surface-2/20 opacity-60 hover:opacity-100'
                        : atrasada
                        ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                        : 'bg-surface-2/40 hover:bg-surface-2/80',
                    )}
                  >
                    {/* Botão de Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleConcluida(t, e)}
                      title={t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                      className="mt-0.5 text-muted hover:text-brand transition-colors shrink-0"
                    >
                      {t.concluida ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Circle className="size-4 text-muted group-hover:text-brand" />
                      )}
                    </button>

                    {/* Conteúdo da Tarefa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={cn(
                            'text-xs font-semibold truncate',
                            t.concluida ? 'line-through text-muted' : 'text-fg',
                          )}
                        >
                          {t.titulo}
                        </span>

                        {atrasada && (
                          <Badge tone="red" className="text-[10px] py-0 px-1.5">
                            Atrasada
                          </Badge>
                        )}

                        {t.prioridade === 'alta' && !t.concluida && (
                          <Badge tone="red" className="text-[10px] py-0 px-1.5">
                            Alta
                          </Badge>
                        )}
                      </div>

                      {t.observacoes && (
                        <p className="text-[11px] text-muted line-clamp-1 mb-1.5">
                          {t.observacoes}
                        </p>
                      )}

                      {/* Metadados / Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                        {/* Data / Dia */}
                        {tab === 'semana' && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium border',
                              isHoje
                                ? 'bg-brand/10 text-brand border-brand/20'
                                : 'bg-surface-2 text-muted border-line',
                            )}
                          >
                            <Calendar className="size-2.5" />
                            {isHoje ? 'Hoje' : fmtDateShort(t.data)}
                          </span>
                        )}

                        {/* Horário */}
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-1.5 py-0.5">
                          {t.diaInteiro ? (
                            <>
                              <Sun className="size-2.5 text-amber-500" />
                              <span>Dia todo (08:00)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="size-2.5 text-brand" />
                              <span>{t.horario || '08:00'}</span>
                            </>
                          )}
                        </span>

                        {/* Recorrência */}
                        {t.recorrencia && t.recorrencia !== 'nenhuma' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-1.5 py-0.5">
                            <Repeat className="size-2.5 text-sky-500" />
                            <span>{LABEL_RECORRENCIA_TAREFA[t.recorrencia]}</span>
                          </span>
                        )}

                        {/* Obra */}
                        {obra && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-1.5 py-0.5">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: obra.cor }}
                            />
                            <span className="truncate max-w-[100px]">{obra.nome}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {tarefasExibidas.length > 5 && (
                <div className="pt-1 text-center">
                  <Link
                    to="/tarefas"
                    className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <span>+ {tarefasExibidas.length - 5} outras tarefas em aberto</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Rodapé móvel com link para ver todas */}
          <div className="sm:hidden pt-3 border-t border-line mt-3">
            <Link
              to="/tarefas"
              className="flex items-center justify-center gap-1 text-xs font-semibold text-brand py-1"
            >
              <span>Ver todas as tarefas</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      <TarefaFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tarefaParaEditar={tarefaParaEditar}
        dataPadrao={hoje}
      />
    </>
  );
}
