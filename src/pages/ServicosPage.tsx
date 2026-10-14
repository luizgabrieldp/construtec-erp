import { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  Briefcase,
  Building2,
  Phone,
  Eye,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress, Select } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import type { ServicoEmpreitada } from '@/domain/types';
import { LABEL_STATUS_SERVICO } from '@/domain/labels';
import { fmtBRL, fmtDate, fmtPct } from '@/lib/format';
import { ServicoFormDialog } from '@/features/servicos/ServicoFormDialog';
import { DetalhesServicoDialog } from '@/features/servicos/DetalhesServicoDialog';

export function ServicosPage() {
  const data = useData();

  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroFuncao, setFiltroFuncao] = useState<string>('todas');

  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [servicoDetalhes, setServicoDetalhes] = useState<ServicoEmpreitada | null>(null);
  const [servicoEditar, setServicoEditar] = useState<ServicoEmpreitada | null>(null);

  const servicos = data.servicos || [];

  // Cálculos de métricas gerais
  const metrics = useMemo(() => {
    let totalContratado = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let ativosCount = 0;

    servicos.forEach((s) => {
      if (s.status === 'cancelado') return;
      totalContratado += s.valorTotal;
      if (s.status === 'andamento') ativosCount++;

      s.etapas.forEach((e) => {
        const c = data.contasPagar.find((cp) => cp.id === e.contaPagarId);
        if (c?.status === 'pago') {
          totalPago += e.valor;
        } else {
          totalPendente += e.valor;
        }
      });
    });

    return { totalContratado, totalPago, totalPendente, ativosCount };
  }, [servicos, data.contasPagar]);

  // Funções únicas para o filtro
  const funcoesDisponiveis = useMemo(() => {
    const setF = new Set<string>();
    servicos.forEach((s) => {
      if (s.funcao) setF.add(s.funcao);
    });
    return Array.from(setF);
  }, [servicos]);

  // Filtragem da lista
  const servicosFiltrados = useMemo(() => {
    return servicos.filter((s) => {
      if (filtroObra !== 'todas' && s.obraId !== filtroObra) return false;
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
      if (filtroFuncao !== 'todas' && s.funcao !== filtroFuncao) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        return (
          s.descricao.toLowerCase().includes(q) ||
          s.prestadorNome.toLowerCase().includes(q) ||
          s.funcao.toLowerCase().includes(q) ||
          (s.prestadorContato && s.prestadorContato.includes(q))
        );
      }
      return true;
    });
  }, [servicos, filtroObra, filtroStatus, filtroFuncao, busca]);

  return (
    <>
      <PageHeader
        title="Serviços & Empreitadas"
        subtitle="Gestão de mão de obra terceirizada por valor fechado, etapas de entrega e pagamentos"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setModalNovoOpen(true)}>
            Novo Serviço / Empreitada
          </Button>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total em Empreitadas"
          value={fmtBRL(metrics.totalContratado)}
          icon={<Briefcase className="size-5 text-brand" />}
          hint={`${servicos.filter((s) => s.status !== 'cancelado').length} contratos firmados`}
        />
        <StatCard
          label="Total Liquidado"
          value={fmtBRL(metrics.totalPago)}
          icon={<CheckCircle className="size-5 text-emerald-500" />}
          tone="green"
          hint="Etapas pagas a prestadores"
        />
        <StatCard
          label="Saldo a Pagar (Em Aberto)"
          value={fmtBRL(metrics.totalPendente)}
          icon={<DollarSign className="size-5 text-amber-500" />}
          tone={metrics.totalPendente > 0 ? 'amber' : undefined}
          hint="Etapas pendentes de conclusão/vencimento"
        />
        <StatCard
          label="Contratos em Andamento"
          value={metrics.ativosCount}
          icon={<Wrench className="size-5 text-blue-500" />}
          tone="blue"
          hint="Serviços sendo executados em campo"
        />
      </div>

      {/* Tabela de Serviços e Empreitadas */}
      <Card className="mt-6">
        <CardHeader
          title="Contratos de Prestação de Serviços"
          subtitle={`${servicosFiltrados.length} contrato(s) localizado(s)`}
        />

        <div className="p-5 pt-0">
          {/* Filtros */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input
                placeholder="Buscar por serviço, prestador ou contato..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
                <option value="todas">Todas as Obras</option>
                {data.obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>

              <Select value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}>
                <option value="todas">Todas as Especialidades</option>
                {funcoesDisponiveis.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>

              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="andamento">Em Andamento</option>
                <option value="concluido">Concluídos</option>
                <option value="planejamento">Planejamento</option>
                <option value="cancelado">Cancelados</option>
              </Select>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th className="pb-3">Serviço & Especialidade</th>
                  <th className="pb-3">Prestador / Contato</th>
                  <th className="pb-3">Obra Vinculada</th>
                  <th className="pb-3">Prazo</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Valor & Pagamento</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {servicosFiltrados.map((s) => {
                  const obra = data.obras.find((o) => o.id === s.obraId);

                  // Cálculos financeiros do contrato
                  let pago = 0;
                  s.etapas.forEach((e) => {
                    const c = data.contasPagar.find((cp) => cp.id === e.contaPagarId);
                    if (c?.status === 'pago') pago += e.valor;
                  });
                  const pctPago = s.valorTotal > 0 ? pago / s.valorTotal : 0;

                  return (
                    <tr key={s.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 pr-4 max-w-xs">
                        <div className="font-semibold text-fg">{s.descricao}</div>
                        <div className="mt-0.5">
                          <Badge tone="blue">{s.funcao}</Badge>
                        </div>
                      </td>

                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="font-medium text-fg">{s.prestadorNome}</div>
                        {s.prestadorContato && (
                          <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                            <Phone className="size-3" />
                            {s.prestadorContato}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full shrink-0" style={{ background: obra?.cor || '#FF6B00' }} />
                          <span className="text-xs font-semibold text-fg">{obra?.nome || 'Obra não encontrada'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 pr-4 whitespace-nowrap text-xs text-muted">
                        <div>De: {fmtDate(s.dataInicio)}</div>
                        <div>Até: {fmtDate(s.previsaoEntrega)}</div>
                      </td>

                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <Badge
                          tone={
                            s.status === 'concluido'
                              ? 'green'
                              : s.status === 'andamento'
                              ? 'orange'
                              : 'neutral'
                          }
                        >
                          {LABEL_STATUS_SERVICO[s.status]}
                        </Badge>
                      </td>

                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="font-bold text-fg tabular-nums">{fmtBRL(s.valorTotal)}</div>
                        <div className="mt-1 w-28">
                          <Progress value={pctPago} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted mt-0.5 tabular-nums">
                          <span className="text-emerald-500 font-semibold">{fmtBRL(pago)}</span>
                          <span>{fmtPct(pctPago)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="size-3.5" />}
                            onClick={() => setServicoDetalhes(s)}
                            title="Ver detalhes e etapas"
                          >
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="size-3.5" />}
                            onClick={() => setServicoEditar(s)}
                            title="Editar contrato"
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {servicosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
                      Nenhum contrato de serviço por empreitada encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Modais */}
      <ServicoFormDialog
        open={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
      />

      <ServicoFormDialog
        open={!!servicoEditar}
        onClose={() => setServicoEditar(null)}
        servicoParaEditar={servicoEditar}
      />

      <DetalhesServicoDialog
        servico={servicoDetalhes}
        onClose={() => setServicoDetalhes(null)}
        onEditar={(s) => {
          setServicoDetalhes(null);
          setServicoEditar(s);
        }}
      />
    </>
  );
}
