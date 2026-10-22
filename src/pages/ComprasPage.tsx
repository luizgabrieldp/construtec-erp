import { useState } from 'react';
import { Plus, ShoppingCart, Eye, Ban, Calendar, Search } from 'lucide-react';
import { Button, PageHeader, Card, Badge, Input } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje } from '@/hooks';
import type { Compra } from '@/domain/types';
import { compraTotal } from '@/domain/engine';
import { fmtBRL, fmtDate } from '@/lib/format';
import { isBetween, startOfMonth, endOfMonth } from '@/lib/dates';
import { NovaCompraDialog } from '@/features/compras/NovaCompraDialog';
import { DetalhesCompraDialog } from '@/features/compras/DetalhesCompraDialog';

export function ComprasPage() {
  const data = useData();
  const hoje = useHoje();
  const mutate = useErp((s) => s.mutate);

  const [busca, setBusca] = useState('');
  const [modalNovaOpen, setModalNovaOpen] = useState(false);
  const [compraVisualizando, setCompraVisualizando] = useState<Compra | null>(null);

  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  const comprasFiltradas = data.compras
    .filter((c) => {
      const forn = data.fornecedores.find((f) => f.id === c.fornecedorId);
      const matchBusca =
        c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        c.documento.toLowerCase().includes(busca.toLowerCase()) ||
        forn?.nome.toLowerCase().includes(busca.toLowerCase());
      return matchBusca;
    })
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  const totalCompradoGeral = data.compras
    .filter((c) => c.status === 'ativa')
    .reduce((s, c) => s + compraTotal(c), 0);

  const totalCompradoMes = data.compras
    .filter((c) => c.status === 'ativa' && isBetween(c.data, inicioMes, fimMes))
    .reduce((s, c) => s + compraTotal(c), 0);

  const cancelarCompra = (c: Compra) => {
    // Verificar se já tem parcela paga
    const contas = data.contasPagar.filter((cp) => cp.origemId === c.id);
    const temPaga = contas.some((cp) => cp.status === 'pago');

    if (temPaga) {
      toast('Não é possível cancelar: esta compra possui parcelas já pagas. Estorne o pagamento primeiro.', 'error');
      return;
    }

    if (!window.confirm(`Deseja realmente cancelar a compra "${c.descricao}"? As contas a pagar serão canceladas e os materiais estornados do orçamento e estoque.`)) {
      return;
    }

    mutate(
      (d) => {
        const item = d.compras.find((x) => x.id === c.id);
        if (item) item.status = 'cancelada';

        // Cancela as contas a pagar
        d.contasPagar.forEach((cp) => {
          if (cp.origemId === c.id) cp.status = 'cancelado';
        });
      },
      {
        acao: 'Compras',
        descricao: `Cancelou a compra "${c.descricao}" e estornou contas a pagar associadas`,
      },
    );

    toast(`Compra "${c.descricao}" cancelada com sucesso.`);
  };

  return (
    <>
      <PageHeader
        title="Compras Centrais & Rateio Inteligente"
        subtitle="Lançamento de cargas fechadas, distribuição de cotas entre obras e controle de parcelas"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModalNovaOpen(true)}>
            Nova Compra com Rateio
          </Button>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Total Comprado"
          value={fmtBRL(totalCompradoGeral)}
          hint="Histórico de insumos"
          icon={<ShoppingCart className="size-4 sm:size-5" />}
          tone="brand"
        />
        <StatCard
          label="Compras no Mês"
          value={fmtBRL(totalCompradoMes)}
          hint="Ciclo atual"
          icon={<Calendar className="size-4 sm:size-5" />}
          tone="blue"
        />
        <StatCard
          label="Pedidos Ativos"
          value={`${data.compras.filter((c) => c.status === 'ativa').length} pedidos`}
          hint={`${data.compras.filter((c) => c.destinos.length > 1).length} com rateio`}
          icon={<ShoppingCart className="size-4 sm:size-5" />}
          tone="green"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Barra de Busca */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <Input
            placeholder="Buscar por descrição, fornecedor ou nota fiscal..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela de Compras */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Data / Pedido</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Descrição da Carga</th>
                <th className="px-4 py-3 text-center">Destinos (Rateio)</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comprasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-xs">
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : (
                comprasFiltradas.map((compra) => {
                  const forn = data.fornecedores.find((f) => f.id === compra.fornecedorId);
                  const total = compraTotal(compra);
                  const contas = data.contasPagar.filter((c) => c.origemId === compra.id);
                  const pagas = contas.filter((c) => c.status === 'pago').length;

                  return (
                    <tr key={compra.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-fg">{fmtDate(compra.data)}</div>
                        <div className="text-[11px] text-muted">{compra.documento}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-fg">{forn?.nome || '—'}</div>
                        <div className="text-[11px] text-muted">{forn?.cidade}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-fg">{compra.descricao}</div>
                        <div className="text-[11px] text-muted">
                          {compra.itens.length} {compra.itens.length === 1 ? 'item' : 'itens'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                          {compra.destinos.length === 1
                            ? '1 obra (Direta)'
                            : `${compra.destinos.length} obras (Rateada)`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                        {fmtBRL(total)}
                        <div className="text-[10px] text-muted font-normal">
                          {contas.length}x ({pagas} pagas)
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge tone={compra.status === 'ativa' ? 'green' : 'neutral'}>
                          {compra.status === 'ativa' ? 'Ativa' : 'Cancelada'}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Eye className="size-3.5" />}
                            onClick={() => setCompraVisualizando(compra)}
                            title="Ver detalhes dos itens e rateio"
                          >
                            Detalhes
                          </Button>
                          {compra.status === 'ativa' && pagas === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Ban className="size-3.5 text-red-500" />}
                              onClick={() => cancelarCompra(compra)}
                              title="Cancelar compra"
                            >
                              Cancelar
                            </Button>
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
      <NovaCompraDialog
        open={modalNovaOpen}
        onClose={() => setModalNovaOpen(false)}
      />
      <DetalhesCompraDialog
        compra={compraVisualizando}
        onClose={() => setCompraVisualizando(null)}
      />
    </>
  );
}
