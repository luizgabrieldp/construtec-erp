import { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Clock,
  Sun,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Building2,
  Filter,
  Check,
  User,
  Users,
} from 'lucide-react';
import { PageHeader, Card, Badge, Button, Input, Select } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje } from '@/hooks';
import type { Tarefa, PrioridadeTarefa } from '@/domain/types';
import { LABEL_RECORRENCIA_TAREFA, LABEL_PRIORIDADE_TAREFA } from '@/domain/labels';
import { startOfWeek, addDays } from '@/lib/dates';
import { fmtDate, fmtDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { TarefaFormDialog } from '@/features/tarefas/TarefaFormDialog';

type FiltroAba = 'todas' | 'hoje' | 'semana' | 'pendentes' | 'concluidas';

export function TarefasPage() {
  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const hoje = useHoje();

  const [abaAtiva, setAbaAtiva] = useState<FiltroAba>('todas');
  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState<string>('todas');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');

  const [formOpen, setFormOpen] = useState(false);
  const [tarefaParaEditar, setTarefaParaEditar] = useState<Tarefa | null>(null);

  const semanaInicio = startOfWeek(hoje);
  const semanaFim = addDays(semanaInicio, 6);

  // Mapeamento rápido de obras
  const obrasMap = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string }>();
    data.obras.forEach((o) => map.set(o.id, { nome: o.nome, cor: o.cor }));
    return map;
  }, [data.obras]);

  // Contadores para os stat cards e abas
  const metricas = useMemo(() => {
    let total = data.tarefas.length;
    let pendentesHoje = 0;
    let concluidasHoje = 0;
    let totalHoje = 0;
    let pendentesSemana = 0;
    let concluidasSemana = 0;
    let totalSemana = 0;
    let concluidas = 0;
    let atrasadas = 0;

    data.tarefas.forEach((t) => {
      if (t.data === hoje) {
        totalHoje += 1;
        if (t.concluida) concluidasHoje += 1;
        else pendentesHoje += 1;
      }
      if (t.data >= semanaInicio && t.data <= semanaFim) {
        totalSemana += 1;
        if (t.concluida) concluidasSemana += 1;
        else pendentesSemana += 1;
      }
      if (t.concluida) {
        concluidas += 1;
      } else {
        if (t.data < hoje) atrasadas += 1;
      }
    });

    return {
      total,
      pendentesHoje,
      concluidasHoje,
      totalHoje,
      pendentesSemana,
      concluidasSemana,
      totalSemana,
      concluidas,
      atrasadas,
    };
  }, [data.tarefas, hoje, semanaInicio, semanaFim]);

  // Filtragem e ordenação
  const tarefasFiltradas = useMemo(() => {
    return data.tarefas
      .filter((t) => {
        // Filtro por aba
        if (abaAtiva === 'hoje') {
          if (t.data !== hoje && !(!t.concluida && t.data < hoje)) return false;
        } else if (abaAtiva === 'semana') {
          if (t.data < semanaInicio || t.data > semanaFim) return false;
        } else if (abaAtiva === 'pendentes') {
          if (t.concluida) return false;
        } else if (abaAtiva === 'concluidas') {
          if (!t.concluida) return false;
        }

        // Filtro por obra
        if (filtroObra !== 'todas') {
          if (t.obraId !== filtroObra) return false;
        }

        // Filtro por prioridade
        if (filtroPrioridade !== 'todas') {
          if ((t.prioridade || 'media') !== filtroPrioridade) return false;
        }

        // Busca textual
        if (busca.trim()) {
          const q = busca.toLowerCase();
          const matchTitulo = t.titulo.toLowerCase().includes(q);
          const matchObs = t.observacoes?.toLowerCase().includes(q);
          const obra = t.obraId ? obrasMap.get(t.obraId) : null;
          const matchObra = obra?.nome.toLowerCase().includes(q);
          const matchDest = t.destinatarioNome?.toLowerCase().includes(q);
          if (!matchTitulo && !matchObs && !matchObra && !matchDest) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Pendentes primeiro
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        // Data mais próxima primeiro
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        // Prioridade maior primeiro
        const pesoPrio = { alta: 3, media: 2, baixa: 1 };
        const pA = pesoPrio[a.prioridade || 'media'];
        const pB = pesoPrio[b.prioridade || 'media'];
        return pB - pA;
      });
  }, [data.tarefas, abaAtiva, filtroObra, filtroPrioridade, busca, hoje, semanaInicio, semanaFim, obrasMap]);

  const toggleConcluida = (t: Tarefa) => {
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
    toast(novoStatus ? 'Tarefa marcada como concluída!' : 'Tarefa reaberta!', 'success');
  };

  const excluirTarefa = (t: Tarefa) => {
    if (!confirm(`Deseja realmente excluir a tarefa "${t.titulo}"?`)) return;
    mutate(
      (d) => {
        d.tarefas = d.tarefas.filter((x) => x.id !== t.id);
      },
      {
        acao: 'Tarefas',
        descricao: `Excluiu tarefa: ${t.titulo}`,
      },
    );
    toast('Tarefa removida com sucesso.', 'success');
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
      <PageHeader
        title="Tarefas & Lembretes"
        subtitle="Organize as demandas, vistorias, compras, compromissos diários e pendências da obra"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={abrirNova}>
            Nova Tarefa
          </Button>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Hoje"
          value={`${metricas.concluidasHoje}/${metricas.totalHoje}`}
          icon={<Calendar className="size-4 sm:size-5 text-brand" />}
          tone="brand"
          hint={metricas.pendentesHoje === 0 ? 'Tudo em dia' : `${metricas.pendentesHoje} pendente(s)`}
        />
        <StatCard
          label="Semana"
          value={`${metricas.concluidasSemana}/${metricas.totalSemana}`}
          icon={<Clock className="size-4 sm:size-5 text-amber-500" />}
          tone="amber"
          hint={metricas.pendentesSemana === 0 ? 'Semana concluída' : `${metricas.pendentesSemana} pendente(s)`}
        />
        <StatCard
          label="Atrasadas"
          value={metricas.atrasadas}
          icon={<AlertCircle className="size-4 sm:size-5 text-red-500" />}
          tone="red"
          hint={metricas.atrasadas === 0 ? 'Zero atrasos' : 'Ação imediata'}
        />
        <StatCard
          label="Total"
          value={metricas.total}
          icon={<CheckSquare className="size-4 sm:size-5 text-sky-500" />}
          tone="blue"
          hint={`${metricas.concluidas} concluída(s)`}
        />
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-4">
          {/* Abas Superiores */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
            {[
              { id: 'todas', label: 'Todas as Tarefas', count: metricas.total },
              { id: 'hoje', label: 'Hoje / Urgentes', count: metricas.pendentesHoje + metricas.atrasadas },
              { id: 'semana', label: 'Esta Semana', count: metricas.pendentesSemana },
              { id: 'pendentes', label: 'Apenas Pendentes', count: metricas.total - metricas.concluidas },
              { id: 'concluidas', label: 'Concluídas', count: metricas.concluidas },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id as FiltroAba)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  abaAtiva === tab.id
                    ? 'bg-brand text-white shadow-sm shadow-brand/20'
                    : 'bg-surface-2 text-muted hover:text-fg hover:border-brand/40 border border-transparent',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px]',
                    abaAtiva === tab.id ? 'bg-white/20 text-white' : 'bg-surface text-muted',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filtros em Linha: Busca + Obra + Prioridade */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                placeholder="Buscar por título, observações ou obra..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
              <option value="todas">Todas as Obras</option>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>

            <Select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)}>
              <option value="todas">Todas as Prioridades</option>
              <option value="alta">Alta Prioridade</option>
              <option value="media">Média Prioridade</option>
              <option value="baixa">Baixa Prioridade</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Tarefas */}
      <div className="mt-4 space-y-3">
        {tarefasFiltradas.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="size-12 text-muted/30 mb-3" />
            <h3 className="text-base font-semibold text-fg">Nenhuma tarefa encontrada</h3>
            <p className="text-xs text-muted max-w-sm mt-1 mb-4">
              {busca || filtroObra !== 'todas' || filtroPrioridade !== 'todas'
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente limpar ou ajustar a busca.'
                : 'Não há tarefas nesta seção no momento. Cadastre lembretes e pendências da obra!'}
            </p>
            <Button size="sm" icon={<Plus className="size-3.5" />} onClick={abrirNova}>
              Nova Tarefa
            </Button>
          </Card>
        ) : (
          tarefasFiltradas.map((t) => {
            const obra = t.obraId ? obrasMap.get(t.obraId) : null;
            const atrasada = !t.concluida && t.data < hoje;
            const isHoje = t.data === hoje;

            return (
              <Card
                key={t.id}
                className={cn(
                  'group p-4 transition-all hover:border-brand/40',
                  t.concluida
                    ? 'bg-surface-2/20 opacity-70 hover:opacity-100'
                    : atrasada
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'bg-surface',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Lado Esquerdo: Checkbox + Título + Detalhes */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleConcluida(t)}
                      title={t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                      className="mt-0.5 text-muted hover:text-brand transition-colors shrink-0"
                    >
                      {t.concluida ? (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      ) : (
                        <Circle className="size-5 text-muted group-hover:text-brand" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Título e Badges Principais */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'text-sm font-semibold truncate',
                            t.concluida ? 'line-through text-muted' : 'text-fg',
                          )}
                        >
                          {t.titulo}
                        </span>

                        {atrasada && (
                          <Badge tone="red" className="text-[10px]">
                            Atrasada
                          </Badge>
                        )}

                        {t.prioridade === 'alta' && !t.concluida && (
                          <Badge tone="red" className="text-[10px]">
                            Alta
                          </Badge>
                        )}
                        {t.prioridade === 'media' && !t.concluida && (
                          <Badge tone="amber" className="text-[10px]">
                            Média
                          </Badge>
                        )}
                        {t.prioridade === 'baixa' && !t.concluida && (
                          <Badge tone="neutral" className="text-[10px]">
                            Baixa
                          </Badge>
                        )}
                      </div>

                      {/* Observações / Descrição */}
                      {t.observacoes && (
                        <p className="text-xs text-muted mb-2 whitespace-pre-line">
                          {t.observacoes}
                        </p>
                      )}

                      {/* Metadados: Data, Horário, Recorrência, Obra */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted pt-1">
                        {/* Data */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border text-[11px]',
                            isHoje
                              ? 'bg-brand/10 text-brand border-brand/20 font-bold'
                              : 'bg-surface-2 text-muted border-line',
                          )}
                        >
                          <Calendar className="size-3" />
                          <span>{isHoje ? 'Hoje' : fmtDate(t.data)}</span>
                        </span>

                        {/* Horário */}
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px]">
                          {t.diaInteiro ? (
                            <>
                              <Sun className="size-3 text-amber-500" />
                              <span>Dia todo (Aviso 08:00)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="size-3 text-brand" />
                              <span>{t.horario || '08:00'}</span>
                            </>
                          )}
                        </span>

                        {/* Recorrência */}
                        {t.recorrencia && t.recorrencia !== 'nenhuma' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px]">
                            <Repeat className="size-3 text-sky-500" />
                            <span>{LABEL_RECORRENCIA_TAREFA[t.recorrencia] || t.recorrencia}</span>
                          </span>
                        )}

                        {/* Obra */}
                        {obra && (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px]">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: obra.cor }}
                            />
                            <span className="font-medium text-fg">{obra.nome}</span>
                          </span>
                        )}

                        {/* Destinatário */}
                        {t.destinatarioTipo === 'todos' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                            <Users className="size-3" />
                            <span>Para todos</span>
                          </span>
                        ) : t.destinatarioNome || t.destinatarioTipo === 'usuario' || t.destinatarioTipo === 'eu' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-line px-2 py-0.5 text-[11px] text-fg">
                            <User className="size-3 text-brand" />
                            <span>{t.destinatarioNome || (t.destinatarioTipo === 'eu' ? 'Apenas para mim' : 'Usuário')}</span>
                          </span>
                        ) : null}

                        {t.concluida && t.concluidaEm && (
                          <span className="text-[11px] text-muted italic ml-auto">
                            Concluída em {fmtDateShort(t.concluidaEm.slice(0, 10))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações: Editar e Excluir */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 className="size-3.5" />}
                      onClick={() => abrirEdicao(t)}
                      title="Editar tarefa"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="size-3.5 text-red-500" />}
                      onClick={() => excluirTarefa(t)}
                      title="Excluir tarefa"
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <TarefaFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tarefaParaEditar={tarefaParaEditar}
        dataPadrao={hoje}
      />
    </>
  );
}
