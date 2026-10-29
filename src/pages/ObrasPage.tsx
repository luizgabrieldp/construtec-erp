import { useState } from 'react';
import { Plus, Search, Building2, Eye, Calendar, HardHat, CheckCircle2, Clock, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { Button, Input, PageHeader, Card, Badge, Progress, Select } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { AntigravityParticlesCanvas } from '@/components/ui/AntigravityParticlesCanvas';
import { TableWatermark } from '@/components/brand/TableWatermark';
import { useData } from '@/data/store';
import { useIsAdmin, useResumo } from '@/hooks';
import type { Obra } from '@/domain/types';
import { LABEL_OBRA_STATUS, getLabelFase } from '@/domain/labels';
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

  type CriterioOrdenacao =
    | 'nome-asc'
    | 'nome-desc'
    | 'status'
    | 'prazo-conclusao'
    | 'prazo-inicio'
    | 'prazo-decorrido'
    | 'entrega-asc'
    | 'entrega-desc'
    | 'data-inicio-desc'
    | 'data-inicio-asc';

  const [modoExibicao, setModoExibicao] = useState<'cards' | 'lista'>('cards');
  const [criterioOrdenacao, setCriterioOrdenacao] = useState<CriterioOrdenacao>('nome-asc');

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

  const obrasOrdenadas = [...obrasFiltradas].sort((a, b) => {
    if (criterioOrdenacao === 'nome-asc') {
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'nome-desc') {
      return b.nome.localeCompare(a.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'status') {
      const pesoStatus: Record<string, number> = {
        andamento: 1,
        planejamento: 2,
        pausada: 3,
        concluida: 4,
      };
      const diff = (pesoStatus[a.status] || 99) - (pesoStatus[b.status] || 99);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'prazo-conclusao') {
      // Obras concluídas já foram finalizadas e devem ser posicionadas no final
      if (a.status === 'concluida' && b.status !== 'concluida') return 1;
      if (a.status !== 'concluida' && b.status === 'concluida') return -1;

      const diasA = diffDays(r.hoje, a.previsaoEntrega);
      const diasB = diffDays(r.hoje, b.previsaoEntrega);
      const diff = diasA - diasB;
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'prazo-inicio') {
      // Obras em planejamento ou recém iniciadas primeiro (menor percentual decorrido)
      const prazoTotalA = Math.max(1, diffDays(a.dataInicio, a.previsaoEntrega));
      const decorridoA = Math.max(0, Math.min(1, diffDays(a.dataInicio, r.hoje) / prazoTotalA));
      const prazoTotalB = Math.max(1, diffDays(b.dataInicio, b.previsaoEntrega));
      const decorridoB = Math.max(0, Math.min(1, diffDays(b.dataInicio, r.hoje) / prazoTotalB));
      const diff = decorridoA - decorridoB;
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'prazo-decorrido') {
      const prazoTotalA = Math.max(1, diffDays(a.dataInicio, a.previsaoEntrega));
      const decorridoA = Math.max(0, Math.min(1, diffDays(a.dataInicio, r.hoje) / prazoTotalA));
      const prazoTotalB = Math.max(1, diffDays(b.dataInicio, b.previsaoEntrega));
      const decorridoB = Math.max(0, Math.min(1, diffDays(b.dataInicio, r.hoje) / prazoTotalB));
      const diff = decorridoB - decorridoA;
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'entrega-asc') {
      const diff = a.previsaoEntrega.localeCompare(b.previsaoEntrega);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'entrega-desc') {
      const diff = b.previsaoEntrega.localeCompare(a.previsaoEntrega);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'data-inicio-desc') {
      const diff = b.dataInicio.localeCompare(a.dataInicio);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    if (criterioOrdenacao === 'data-inicio-asc') {
      const diff = a.dataInicio.localeCompare(b.dataInicio);
      if (diff !== 0) return diff;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }
    return 0;
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
        subtitle="Acompanhamento simultâneo de custos, prazos e equipes por obra"
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

      {/* Barra de Filtros e Controles de Visualização */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

        {/* Linha Secundária: Ordenação e Alternador de Modo (Cards vs Lista) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-fg">{obrasOrdenadas.length}</span>
            <span>de {data.obras.length} obras</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <ArrowUpDown className="size-3.5 text-brand" />
                <span className="hidden sm:inline font-medium">Ordenar:</span>
              </div>
              <Select
                value={criterioOrdenacao}
                onChange={(e) => setCriterioOrdenacao(e.target.value as CriterioOrdenacao)}
                className="text-xs py-1.5 pr-8"
              >
                <option value="nome-asc">Nome (A-Z)</option>
                <option value="nome-desc">Nome (Z-A)</option>
                <option value="status">Status (Andamento → Concluída)</option>
                <option value="prazo-conclusao">Mais Próxima de Finalizar</option>
                <option value="prazo-inicio">Em Início (Menor Prazo Decorrido)</option>
                <option value="prazo-decorrido">Prazo Decorrido (% maior)</option>
                <option value="entrega-asc">Previsão de Entrega (Mais próximas)</option>
                <option value="entrega-desc">Previsão de Entrega (Mais distantes)</option>
                <option value="data-inicio-desc">Data de Início (Recentes primeiro)</option>
                <option value="data-inicio-asc">Data de Início (Antigas primeiro)</option>
              </Select>
            </div>

            {/* Alternador Cards vs Lista */}
            <div className="flex items-center rounded-xl border border-line bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setModoExibicao('cards')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  modoExibicao === 'cards'
                    ? 'bg-surface text-fg shadow-xs font-semibold'
                    : 'text-muted hover:text-fg'
                }`}
                title="Exibir como Cards"
              >
                <LayoutGrid className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setModoExibicao('lista')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  modoExibicao === 'lista'
                    ? 'bg-surface text-fg shadow-xs font-semibold'
                    : 'text-muted hover:text-fg'
                }`}
                title="Exibir como Lista em Tabela"
              >
                <List className="size-3.5" />
                <span>Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Obras / Tabela Lista */}
      {obrasOrdenadas.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          <Building2 className="mx-auto size-12 opacity-30 mb-3" />
          <p className="text-base font-semibold text-fg">Nenhuma obra encontrada</p>
          <p className="text-xs mt-1">Tente ajustar seus termos de pesquisa ou cadastre uma nova obra.</p>
        </Card>
      ) : modoExibicao === 'cards' ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {obrasOrdenadas.map((obra) => {
            const ro = r.porObra[obra.id];
            const prazoTotal = Math.max(1, diffDays(obra.dataInicio, obra.previsaoEntrega));
            const decorrido = Math.max(0, Math.min(1, diffDays(obra.dataInicio, r.hoje) / prazoTotal));

            return (
              <Card key={obra.id} className="group relative flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-md">
                {/* Partículas Antigravity interativas no hover do card da obra */}
                <AntigravityParticlesCanvas
                  tone={obra.status === 'andamento' ? 'green' : obra.status === 'pausada' ? 'amber' : 'brand'}
                  particleCount={48}
                />

                <div className="relative z-1 flex flex-col justify-between h-full">
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
                    <div className="mt-4 rounded-xl bg-surface-2 p-2.5 text-center text-xs">
                      <span className="text-muted block text-[10px] uppercase font-bold">Equipe Hoje</span>
                      <span className="font-bold text-fg">{ro?.equipeHoje || 0} operários</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ações */}
                <div className="border-t border-line bg-surface-2/40 px-4 py-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full justify-center"
                    icon={<Eye className="size-3.5" />}
                    onClick={() => setObraVisualizando(obra)}
                  >
                    Detalhes da Obra
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    ) : (
      /* Modo Lista: Tabela limpa, compacta e responsiva com marca d'água oficial */
      <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface shadow-xs">
        {/* Marca d'água oficial CONSTRUTEC com posicionamento inteligente Sticky Viewport */}
        <TableWatermark size="lg" />

        <table className="relative z-1 w-full text-left text-sm border-collapse min-w-[780px]">
            <thead className="border-b border-line bg-surface-2/70 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Responsável / Arquiteto</th>
                <th className="px-4 py-3">Fase Atual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progresso / Prazo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {obrasOrdenadas.map((obra) => {
                const prazoTotal = Math.max(1, diffDays(obra.dataInicio, obra.previsaoEntrega));
                const decorrido = Math.max(0, Math.min(1, diffDays(obra.dataInicio, r.hoje) / prazoTotal));
                const faseLabel = getLabelFase(obra.fase, obra);

                return (
                  <tr key={obra.id} className="hover:bg-surface-2/40 transition-colors">
                    {/* Coluna 1: Nome da Obra */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="size-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: obra.cor }}
                          title={`Identificador visual: ${obra.nome}`}
                        />
                        <div>
                          <div className="font-bold text-fg text-sm">{obra.nome}</div>
                          {obra.endereco && (
                            <div className="text-[11px] text-muted truncate max-w-[200px]" title={obra.endereco}>
                              {obra.endereco}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Coluna 2: Cliente */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-medium text-fg">
                        {obra.cliente || <span className="text-muted italic">Não informado</span>}
                      </div>
                    </td>

                    {/* Coluna 3: Responsável / Arquiteto */}
                    <td className="px-4 py-3.5 text-xs">
                      {obra.responsavel ? (
                        <div>
                          <span className="font-medium text-fg">{obra.responsavel}</span>
                          {obra.arquiteto && (
                            <div className="text-[11px] text-muted">Arq: {obra.arquiteto}</div>
                          )}
                        </div>
                      ) : obra.arquiteto ? (
                        <div>
                          <span className="font-medium text-fg">Arq: {obra.arquiteto}</span>
                        </div>
                      ) : (
                        <span className="text-muted italic">—</span>
                      )}
                    </td>

                    {/* Coluna 4: Fase Atual */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg">
                        <span className="size-1.5 rounded-full bg-brand" />
                        {faseLabel}
                      </span>
                    </td>

                    {/* Coluna 5: Status */}
                    <td className="px-4 py-3.5">
                      <Badge tone={obra.status === 'andamento' ? 'green' : obra.status === 'pausada' ? 'amber' : 'neutral'}>
                        {LABEL_OBRA_STATUS[obra.status]}
                      </Badge>
                    </td>

                    {/* Coluna 6: Progresso / Prazo decorrido */}
                    <td className="px-4 py-3.5">
                      <div className="w-36 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted">Decorrido</span>
                          <span className="font-bold text-fg">{fmtPct(decorrido)}</span>
                        </div>
                        <Progress value={decorrido} />
                        <div className="text-[10px] text-muted truncate">
                          Entrega: {obra.previsaoEntrega ? obra.previsaoEntrega.split('-').reverse().join('/') : '—'}
                        </div>
                      </div>
                    </td>

                    {/* Coluna 7: Botão Detalhes da Obra */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Eye className="size-3.5" />}
                        onClick={() => setObraVisualizando(obra)}
                      >
                        Detalhes da Obra
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        onEditar={abrirEdicao}
      />
    </>
  );
}
