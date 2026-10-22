import { useState } from 'react';
import { Plus, Search, Building2, Eye, Edit2, Calendar, HardHat, CheckCircle2, Clock } from 'lucide-react';
import { Button, Input, PageHeader, Card, Badge, Progress } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import { useIsAdmin, useResumo } from '@/hooks';
import type { Obra } from '@/domain/types';
import { LABEL_OBRA_STATUS } from '@/domain/labels';
import { fmtBRL, fmtPct } from '@/lib/format';
import { diffDays } from '@/lib/dates';
import { ObraFormDialog } from '@/features/obras/ObraFormDialog';
import { ObraDetalhesDialog } from '@/features/obras/ObraDetalhesDialog';
import { FaseObraStepper } from '@/features/obras/FaseObraStepper';

export function ObrasPage() {
  const data = useData();
  const r = useResumo();
  const isAdmin = useIsAdmin();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [obraEditando, setObraEditando] = useState<Obra | null>(null);
  const [obraVisualizando, setObraVisualizando] = useState<Obra | null>(null);

  const obrasAndamento = data.obras.filter((o) => o.status === 'andamento').length;
  const obrasPlanejamento = data.obras.filter((o) => o.status === 'planejamento').length;
  const obrasPausadas = data.obras.filter((o) => o.status === 'pausada').length;
  const obrasConcluidas = data.obras.filter((o) => o.status === 'concluida').length;

  const obrasFiltradas = data.obras.filter((o) => {
    const q = busca.toLowerCase();
    const matchBusca =
      o.nome.toLowerCase().includes(q) ||
      o.cliente.toLowerCase().includes(q) ||
      (o.responsavel || '').toLowerCase().includes(q) ||
      (o.arquiteto || '').toLowerCase().includes(q);
    const matchStatus = filtroStatus === 'todos' || o.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const abrirEdicao = (obra: Obra) => {
    setObraEditando(obra);
    setModalFormOpen(true);
  };

  const abrirNovo = () => {
    setObraEditando(null);
    setModalFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Gestão de Obras & Empreendimentos"
        subtitle="Acompanhamento simultâneo de custos, prazos, equipes e máquinas por obra"
        actions={
          isAdmin && (
            <Button icon={<Plus className="size-4" />} onClick={abrirNovo}>
              Nova Obra
            </Button>
          )
        }
      />

      {/* Cards de Métricas das Obras */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Em Andamento"
          value={obrasAndamento}
          icon={<Building2 className="size-4 sm:size-5" />}
          tone="green"
          hint={`de ${data.obras.length} cadastradas`}
        />
        <StatCard
          label="Planejamento"
          value={obrasPlanejamento}
          icon={<Clock className="size-4 sm:size-5" />}
          tone="blue"
          hint={obrasPausadas > 0 ? `${obrasPausadas} pausada(s)` : 'Em preparação'}
        />
        <StatCard
          label="Concluídas"
          value={obrasConcluidas}
          icon={<CheckCircle2 className="size-4 sm:size-5" />}
          tone="brand"
          hint="Obras entregues"
        />
        <StatCard
          label="Em Campo"
          value={r.equipeHoje}
          icon={<HardHat className="size-4 sm:size-5" />}
          tone="amber"
          hint="Operários nas obras"
        />
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <Input
            placeholder="Buscar por nome, cliente ou engenheiro..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['todos', 'andamento', 'planejamento', 'pausada', 'concluida'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroStatus === st
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-surface-2 text-muted hover:text-fg'
              }`}
            >
              {st === 'todos' ? 'Todas' : LABEL_OBRA_STATUS[st as keyof typeof LABEL_OBRA_STATUS]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Obras */}
      {obrasFiltradas.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          <Building2 className="mx-auto size-12 opacity-30 mb-3" />
          <p className="text-base font-semibold text-fg">Nenhuma obra encontrada</p>
          <p className="text-xs mt-1">Tente ajustar seus termos de pesquisa ou cadastre uma nova obra.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {obrasFiltradas.map((obra) => {
            const ro = r.porObra[obra.id];
            const prazoTotal = Math.max(1, diffDays(obra.dataInicio, obra.previsaoEntrega));
            const decorrido = Math.max(0, Math.min(1, diffDays(obra.dataInicio, r.hoje) / prazoTotal));

            return (
              <Card key={obra.id} className="flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-md">
                <div>
                  {/* Faixa superior com a cor da obra */}
                  <div className="h-2 w-full" style={{ backgroundColor: obra.cor }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-fg text-base">{obra.nome}</h3>
                        <p className="text-xs text-muted mt-0.5">{obra.cliente || 'Sem cliente especificado'}</p>
                      </div>
                      <Badge tone={obra.status === 'andamento' ? 'green' : obra.status === 'pausada' ? 'amber' : 'neutral'}>
                        {LABEL_OBRA_STATUS[obra.status]}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-muted">
                      {obra.responsavel && (
                        <div>
                          <span className="font-semibold text-fg">Engenheiro:</span> {obra.responsavel}
                        </div>
                      )}
                      {obra.arquiteto && (
                        <div>
                          <span className="font-semibold text-fg">Arquiteto:</span> {obra.arquiteto}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        <span>Previsão: {obra.previsaoEntrega.split('-').reverse().join('/')}</span>
                        <span className="ml-auto font-medium">({fmtPct(decorrido)} decorrido)</span>
                      </div>
                    </div>

                    {/* Fases da Obra Clicável com 1 Clique */}
                    <div className="mt-4 rounded-xl border border-line bg-surface-2/40 p-2.5">
                      <FaseObraStepper
                        obraId={obra.id}
                        obraNome={obra.nome}
                        faseAtual={obra.fase || 'fundacao'}
                        compact
                      />
                    </div>

                    {/* Barra de Orçamento */}
                    <div className="mt-4 border-t border-line/60 pt-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">Orçamento Comprometido</span>
                        <span className="font-bold text-fg">{fmtPct(ro?.consumoPct || 0)}</span>
                      </div>
                      <Progress value={ro?.consumoPct || 0} />
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-muted tabular-nums">
                          {fmtBRL(ro?.comprometido || 0)}
                        </span>
                        <span className="text-muted tabular-nums">
                          Previsto: {fmtBRL(obra.orcamento)}
                        </span>
                      </div>
                    </div>

                    {/* Resumo do canteiro */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-2.5 text-center text-xs">
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">Equipe Hoje</span>
                        <span className="font-bold text-fg">{ro?.equipeHoje || 0} operários</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px] uppercase font-bold">Máquinas</span>
                        <span className="font-bold text-violet-400">{ro?.maquinasAtivas || 0} ativas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ações */}
                <div className="flex items-center justify-between border-t border-line bg-surface-2/40 px-5 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Eye className="size-3.5" />}
                    onClick={() => setObraVisualizando(obra)}
                  >
                    Detalhes da Obra
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 className="size-3.5" />}
                      onClick={() => abrirEdicao(obra)}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <ObraFormDialog
        open={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        obraParaEditar={obraEditando}
      />
      <ObraDetalhesDialog
        obra={obraVisualizando}
        onClose={() => setObraVisualizando(null)}
      />
    </>
  );
}
