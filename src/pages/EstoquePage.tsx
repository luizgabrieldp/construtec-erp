import { useState } from 'react';
import { Plus, Package, ArrowRightLeft, AlertTriangle, Layers, History, Download, Printer } from 'lucide-react';
import { Button, PageHeader, Card, Badge } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import { useIsAdmin, useHoje } from '@/hooks';
import { SEDE, type CentroId, type Material } from '@/domain/types';
import { LABEL_UNIDADE, LABEL_CATEGORIA_FORNECEDOR } from '@/domain/labels';
import { processarEstoque } from '@/domain/selectors';
import { fmtBRL, fmtDate, fmtNum } from '@/lib/format';
import { MaterialFormDialog } from '@/features/estoque/MaterialFormDialog';
import { MovimentarEstoqueDialog } from '@/features/estoque/MovimentarEstoqueDialog';

export function EstoquePage() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();

  const [abaAtiva, setAbaAtiva] = useState<'saldos' | 'catalogo' | 'historico'>('saldos');
  const [localFiltro, setLocalFiltro] = useState<string>('todos');
  const [modalMaterialOpen, setModalMaterialOpen] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
  const [modalMovimentoOpen, setModalMovimentoOpen] = useState(false);
  const [movMaterialPre, setMovMaterialPre] = useState<string | undefined>();
  const [movLocalPre, setMovLocalPre] = useState<CentroId | undefined>();

  const { estoque } = processarEstoque(data, hoje);

  // Calcular valor total consolidado em estoque
  let valorTotalConsolidado = 0;
  let itensComEstoqueBaixo = 0;

  // Mapa consolidado de materiais (somando todas as obras ou filtrado pelo local)
  const itensEstoqueCalculados = data.materiais.map((mat) => {
    let qtdTotal = 0;
    let valorTotal = 0;

    if (localFiltro === 'todos') {
      Object.keys(estoque).forEach((cid) => {
        const s = estoque[cid as CentroId]?.[mat.id];
        if (s) {
          qtdTotal += s.quantidade;
          valorTotal += s.valor;
        }
      });
    } else {
      const s = estoque[localFiltro as CentroId]?.[mat.id];
      if (s) {
        qtdTotal = s.quantidade;
        valorTotal = s.valor;
      }
    }

    const custoMedio = qtdTotal > 0 ? valorTotal / qtdTotal : 0;
    const estoqueBaixo = mat.estoqueMinimo > 0 && qtdTotal < mat.estoqueMinimo;

    valorTotalConsolidado += valorTotal;
    if (estoqueBaixo) itensComEstoqueBaixo++;

    return {
      material: mat,
      quantidade: qtdTotal,
      custoMedio,
      valorTotal,
      estoqueBaixo,
    };
  });

  const exportarCSV = () => {
    let csv = 'Material;Categoria;Unidade;Quantidade;Custo Medio (R$);Valor Total (R$);Status\n';
    itensEstoqueCalculados.forEach((item) => {
      csv += `${item.material.nome};${LABEL_CATEGORIA_FORNECEDOR[item.material.categoria]};${item.material.unidade};${item.quantidade};${item.custoMedio.toFixed(2).replace('.', ',')};${item.valorTotal.toFixed(2).replace('.', ',')};${item.estoqueBaixo ? 'Estoque Baixo' : 'Normal'}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_construtec_${hoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getNomeLocal = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Estoque Central';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  const abrirMovimentacaoRapida = (matId: string) => {
    setMovMaterialPre(matId);
    setMovLocalPre(localFiltro !== 'todos' ? (localFiltro as CentroId) : undefined);
    setModalMovimentoOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Gestão de Materiais & Estoque Físico"
        subtitle="Saldo por obra e sede, custo médio ponderado, baixas de consumo e transferências"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              onClick={exportarCSV}
              title="Exportar dados em planilha CSV (padrão Brasil)"
            >
              Exportar CSV
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="size-4" />}
              onClick={() => window.print()}
              title="Imprimir relatório timbrado"
            >
              Imprimir
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                icon={<Plus className="size-4" />}
                onClick={() => {
                  setMaterialEditando(null);
                  setModalMaterialOpen(true);
                }}
              >
                Novo Insumo
              </Button>
            )}
            <Button
              icon={<ArrowRightLeft className="size-4" />}
              onClick={() => {
                setMovMaterialPre(undefined);
                setMovLocalPre(undefined);
                setModalMovimentoOpen(true);
              }}
            >
              Movimentar Estoque
            </Button>
          </div>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6 no-print">
        <StatCard
          label="Valor em Materiais"
          value={fmtBRL(valorTotalConsolidado)}
          hint={localFiltro === 'todos' ? 'Total em todas as obras + Sede' : `Em ${getNomeLocal(localFiltro as CentroId)}`}
          icon={<Package className="size-5" />}
          tone="brand"
        />
        <StatCard
          label="Insumos no Catálogo"
          value={`${data.materiais.length} materiais`}
          hint="Itens monitorados pelo ERP"
          icon={<Layers className="size-5" />}
          tone="blue"
        />
        <StatCard
          label="Alertas de Reposição"
          value={`${itensComEstoqueBaixo} itens abaixo do mín.`}
          hint={itensComEstoqueBaixo > 0 ? 'Necessitam de nova compra' : 'Níveis de segurança atendidos'}
          icon={<AlertTriangle className="size-5" />}
          tone={itensComEstoqueBaixo > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 mb-6 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('saldos')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'saldos'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <Package className="size-4" />
            Saldos por Local
          </button>
          <button
            onClick={() => setAbaAtiva('catalogo')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'catalogo'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <Layers className="size-4" />
            Catálogo Geral
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'historico'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <History className="size-4" />
            Histórico de Movimentações
          </button>
        </div>

        {abaAtiva === 'saldos' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Filtrar Local:</span>
            <select
              value={localFiltro}
              onChange={(e) => setLocalFiltro(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 font-semibold text-fg outline-none focus:border-brand"
            >
              <option value="todos">Todos os Locais (Consolidado)</option>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
              {isAdmin && <option value={SEDE}>Sede / Estoque Central</option>}
            </select>
          </div>
        )}
      </div>

      {/* ABA 1: SALDOS */}
      {abaAtiva === 'saldos' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Insumo / Material</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Saldo em Estoque</th>
                  <th className="px-4 py-3 text-right">Custo Médio Unit.</th>
                  <th className="px-4 py-3 text-right">Valor Total em Saldo</th>
                  <th className="px-4 py-3 text-center">Status / Mínimo</th>
                  <th className="px-5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {itensEstoqueCalculados.map(({ material, quantidade, custoMedio, valorTotal, estoqueBaixo }) => (
                  <tr key={material.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-fg">{material.nome}</div>
                      <div className="text-[11px] text-muted">Unidade: {LABEL_UNIDADE[material.unidade]}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      {LABEL_CATEGORIA_FORNECEDOR[material.categoria]}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                      {fmtNum(quantidade)} <span className="text-xs font-normal text-muted">{LABEL_UNIDADE[material.unidade]}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted">
                      {fmtBRL(custoMedio)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-fg">
                      {fmtBRL(valorTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {estoqueBaixo ? (
                        <Badge tone="amber">
                          <AlertTriangle className="size-3" /> Abaixo do mín. ({material.estoqueMinimo})
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Mín: {material.estoqueMinimo} {material.unidade}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center no-print">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => abrirMovimentacaoRapida(material.id)}
                      >
                        Baixar / Transferir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 2: CATÁLOGO */}
      {abaAtiva === 'catalogo' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Insumo</th>
                  <th className="px-4 py-3">Unidade de Medida</th>
                  <th className="px-4 py-3">Categoria de Fornecedor</th>
                  <th className="px-4 py-3 text-right">Estoque Mínimo</th>
                  <th className="px-5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.materiais.map((mat) => (
                  <tr key={mat.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-fg">{mat.nome}</td>
                    <td className="px-4 py-3.5 text-muted">{LABEL_UNIDADE[mat.unidade]}</td>
                    <td className="px-4 py-3.5 text-muted">{LABEL_CATEGORIA_FORNECEDOR[mat.categoria]}</td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-fg">
                      {mat.estoqueMinimo} {mat.unidade}
                    </td>
                    <td className="px-5 py-3.5 text-center no-print">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMaterialEditando(mat);
                            setModalMaterialOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 3: HISTÓRICO DE MOVIMENTAÇÕES */}
      {abaAtiva === 'historico' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Local (Origem / Destino)</th>
                  <th className="px-4 py-3 text-right">Quantidade</th>
                  <th className="px-5 py-3">Observação / Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...data.movimentos]
                  .sort((a, b) => (a.data < b.data ? 1 : -1))
                  .map((m) => {
                    const mat = data.materiais.find((x) => x.id === m.materialId);
                    return (
                      <tr key={m.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="px-5 py-3.5 font-medium tabular-nums text-fg">{fmtDate(m.data)}</td>
                        <td className="px-4 py-3.5">
                          <Badge
                            tone={
                              m.tipo === 'saida'
                                ? 'orange'
                                : m.tipo === 'transferencia'
                                ? 'blue'
                                : m.quantidade >= 0
                                ? 'green'
                                : 'red'
                            }
                          >
                            {m.tipo === 'saida' ? 'Saída' : m.tipo === 'transferencia' ? 'Transferência' : 'Ajuste Físico'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-fg">
                          {mat?.nome || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">
                          {m.tipo === 'transferencia' ? (
                            <span>
                              {getNomeLocal(m.local)} <span className="text-brand">→</span> {m.destino ? getNomeLocal(m.destino) : '—'}
                            </span>
                          ) : (
                            getNomeLocal(m.local)
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                          {m.quantidade > 0 && m.tipo === 'ajuste' ? `+${m.quantidade}` : m.quantidade} {mat?.unidade}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted max-w-xs truncate">
                          {m.observacao}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modais */}
      <MaterialFormDialog
        open={modalMaterialOpen}
        onClose={() => setModalMaterialOpen(false)}
        materialParaEditar={materialEditando}
      />
      <MovimentarEstoqueDialog
        open={modalMovimentoOpen}
        onClose={() => setModalMovimentoOpen(false)}
        materialPreSelecionadoId={movMaterialPre}
        localPreSelecionadoId={movLocalPre}
      />
    </>
  );
}
