import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Download,
  Printer,
  Search,
  Wallet,
} from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader, Select } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { useData } from '@/data/store';
import { useHoje } from '@/hooks';
import { SEDE, type CategoriaGasto, type CentroId } from '@/domain/types';
import { LABEL_CATEGORIA_GASTO } from '@/domain/labels';
import { endOfMonth, isBetween, startOfMonth } from '@/lib/dates';
import { fmtBRL, fmtDate, fmtPct } from '@/lib/format';

interface ItemExtrato {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  categoria: CategoriaGasto;
  entidade: string; // Fornecedor, Colaborador ou Cliente
  centroId: CentroId;
  valor: number;
  status: 'liquidado' | 'pendente';
  documento?: string;
  forma?: string;
}

export function ExtratoPage() {
  const data = useData();
  const hoje = useHoje();

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filtroCentro, setFiltroCentro] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'liquidado' | 'pendente'>('liquidado');
  const [periodoPreset, setPeriodoPreset] = useState<'todos' | 'mes_atual' | 'ultimos_90'>('todos');

  // Construir a lista consolidada de itens de extrato
  const itensExtrato = useMemo(() => {
    const itens: ItemExtrato[] = [];

    // Saídas (Contas a Pagar)
    data.contasPagar.forEach((c) => {
      if (c.status === 'cancelado') return;

      const fornecedor = data.fornecedores.find((f) => f.id === c.fornecedorId);
      const funcionario = data.funcionarios.find((f) => f.id === c.funcionarioId);
      const entidade = fornecedor ? fornecedor.nome : funcionario ? funcionario.nome : 'Construtec (Geral)';

      // Se houver rateio por centros de custo, geramos linhas discriminadas
      if (c.distribuicao.length > 0) {
        c.distribuicao.forEach((d, idx) => {
          itens.push({
            id: `${c.id}_dist_${idx}`,
            data: c.status === 'pago' && c.dataPagamento ? c.dataPagamento : c.vencimento,
            tipo: 'saida',
            descricao: c.distribuicao.length > 1 ? `${c.descricao} (Cota Rateio)` : c.descricao,
            categoria: c.categoria,
            entidade,
            centroId: d.centroId,
            valor: d.valor,
            status: c.status === 'pago' ? 'liquidado' : 'pendente',
            documento: c.documento,
            forma: c.formaPagamento,
          });
        });
      } else {
        itens.push({
          id: c.id,
          data: c.status === 'pago' && c.dataPagamento ? c.dataPagamento : c.vencimento,
          tipo: 'saida',
          descricao: c.descricao,
          categoria: c.categoria,
          entidade,
          centroId: SEDE,
          valor: c.valor,
          status: c.status === 'pago' ? 'liquidado' : 'pendente',
          documento: c.documento,
          forma: c.formaPagamento,
        });
      }
    });

    // Entradas (Contas a Receber)
    data.contasReceber.forEach((r) => {
      if (r.status === 'cancelado') return;
      const obra = data.obras.find((o) => o.id === r.obraId);

      itens.push({
        id: r.id,
        data: r.status === 'recebido' && r.dataRecebimento ? r.dataRecebimento : r.vencimento,
        tipo: 'entrada',
        descricao: r.descricao,
        categoria: 'outros',
        entidade: obra?.cliente || 'Cliente',
        centroId: r.obraId,
        valor: r.valor,
        status: r.status === 'recebido' ? 'liquidado' : 'pendente',
        documento: r.documento,
        forma: r.formaPagamento,
      });
    });

    return itens;
  }, [data.contasPagar, data.contasReceber, data.fornecedores, data.funcionarios]);

  // Aplicar filtros
  const iniMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  const itensFiltrados = useMemo(() => {
    return itensExtrato
      .filter((item) => {
        if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
        if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;
        if (filtroCentro !== 'todos' && item.centroId !== filtroCentro) return false;
        if (filtroCategoria !== 'todos' && item.categoria !== filtroCategoria) return false;

        if (periodoPreset === 'mes_atual') {
          if (!isBetween(item.data, iniMes, fimMes)) return false;
        }

        if (busca.trim()) {
          const q = busca.toLowerCase();
          return (
            item.descricao.toLowerCase().includes(q) ||
            item.entidade.toLowerCase().includes(q) ||
            (item.documento && item.documento.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [itensExtrato, filtroTipo, filtroStatus, filtroCentro, filtroCategoria, periodoPreset, busca, iniMes, fimMes]);

  // Totais do conjunto filtrado
  const totalEntradas = itensFiltrados
    .filter((i) => i.tipo === 'entrada')
    .reduce((s, i) => s + i.valor, 0);

  const totalSaidas = itensFiltrados
    .filter((i) => i.tipo === 'saida')
    .reduce((s, i) => s + i.valor, 0);

  const resultadoLiquido = totalEntradas - totalSaidas;

  const totalSede = itensFiltrados
    .filter((i) => i.tipo === 'saida' && i.centroId === SEDE)
    .reduce((s, i) => s + i.valor, 0);

  const totalObras = itensFiltrados
    .filter((i) => i.tipo === 'saida' && i.centroId !== SEDE)
    .reduce((s, i) => s + i.valor, 0);

  // Exportar para CSV
  const exportarCSV = () => {
    const cabecalho = ['Data', 'Tipo', 'Descricao', 'Entidade', 'Categoria', 'Centro de Custo', 'Documento', 'Status', 'Valor'];
    const linhas = itensFiltrados.map((i) => {
      const centroNome = i.centroId === SEDE ? 'Sede / Matriz' : data.obras.find((o) => o.id === i.centroId)?.nome || i.centroId;
      return [
        fmtDate(i.data),
        i.tipo === 'entrada' ? 'Entrada' : 'Saida',
        `"${i.descricao.replace(/"/g, '""')}"`,
        `"${i.entidade.replace(/"/g, '""')}"`,
        LABEL_CATEGORIA_GASTO[i.categoria] || i.categoria,
        `"${centroNome.replace(/"/g, '""')}"`,
        i.documento || '',
        i.status === 'liquidado' ? 'Liquidado' : 'Pendente',
        i.valor.toFixed(2).replace('.', ','),
      ].join(';');
    });

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extrato_construtec_${hoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imprimirRelatorio = () => {
    window.print();
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Extrato Geral & Fluxo de Caixa"
          subtitle="Visão contábil e financeira unificada: Matriz × Obras, fornecedores e recebíveis"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={<Printer className="size-4" />} onClick={imprimirRelatorio}>
                Imprimir
              </Button>
              <Button variant="primary" icon={<Download className="size-4" />} onClick={exportarCSV}>
                Exportar CSV
              </Button>
            </div>
          }
        />

        {/* Cards de Métricas do Extrato */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total de Entradas"
            value={fmtBRL(totalEntradas)}
            icon={<ArrowDownLeft className="size-5 text-emerald-500" />}
            tone="green"
            hint="Medições de clientes e aportes"
          />
          <StatCard
            label="Total de Saídas"
            value={fmtBRL(totalSaidas)}
            icon={<ArrowUpRight className="size-5 text-red-500" />}
            tone="red"
            hint="Materiais, equipe, locações e fixos"
          />
          <StatCard
            label="Resultado Líquido"
            value={fmtBRL(resultadoLiquido)}
            icon={<Wallet className="size-5" />}
            tone={resultadoLiquido >= 0 ? 'green' : 'red'}
            hint={resultadoLiquido >= 0 ? 'Superávit no período filtrado' : 'Déficit no período filtrado'}
          />
          <StatCard
            label="Custos Sede vs Obras"
            value={
              <span className="flex items-baseline gap-2 text-sm">
                <span className="font-bold text-fg">Sede: {fmtBRL(totalSede)}</span>
                <span className="text-muted">|</span>
                <span className="font-bold text-brand">Obras: {fmtBRL(totalObras)}</span>
              </span>
            }
            icon={<Building2 className="size-5 text-brand" />}
            hint={`Obras absorvem ${fmtPct(totalObras / (totalSaidas || 1))} dos gastos`}
          />
        </div>
      </div>

      {/* Relatório Impresso Cabeçalho Especial */}
      <div className="hidden print:block mb-6 border-b border-black pb-4 text-black">
        <h1 className="text-2xl font-bold">CONSTRUTEC — Construção e Reformas em Geral</h1>
        <p className="text-sm">Extrato Financeiro e Fluxo de Caixa Unificado · Data de emissão: {fmtDate(hoje)}</p>
        <div className="mt-4 grid grid-cols-4 gap-4 text-xs font-semibold">
          <div>Entradas: {fmtBRL(totalEntradas)}</div>
          <div>Saídas: {fmtBRL(totalSaidas)}</div>
          <div>Resultado: {fmtBRL(resultadoLiquido)}</div>
          <div>Itens listados: {itensFiltrados.length}</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="mt-6 print:border-none print:shadow-none">
        <div className="border-b border-line p-4 print:hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input
                placeholder="Buscar por descrição, fornecedor, cliente ou NF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)}>
                <option value="todos">Entradas & Saídas</option>
                <option value="entrada">Apenas Entradas</option>
                <option value="saida">Apenas Saídas</option>
              </Select>

              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}>
                <option value="todos">Todos os Status</option>
                <option value="liquidado">Apenas Liquidados (Caixa Real)</option>
                <option value="pendente">Apenas Pendentes (Previsão)</option>
              </Select>

              <Select value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value)}>
                <option value="todos">Todos os Centros de Custo</option>
                <option value={SEDE}>Sede / Matriz Construtec</option>
                {data.obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>

              <Select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="todos">Todas as Categorias</option>
                {Object.entries(LABEL_CATEGORIA_GASTO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>

              <Select value={periodoPreset} onChange={(e) => setPeriodoPreset(e.target.value as any)}>
                <option value="todos">Todo o Histórico</option>
                <option value="mes_atual">Mês Vigente</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabela de Extrato */}
        <div className="overflow-x-auto p-5">
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted print:text-black">
                <th className="pb-3">Data</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3">Descrição & Doc</th>
                <th className="pb-3">Entidade (Favorecido / Pagador)</th>
                <th className="pb-3">Categoria</th>
                <th className="pb-3">Centro de Custo</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line print:divide-slate-300">
              {itensFiltrados.map((item) => {
                const obra = data.obras.find((o) => o.id === item.centroId);
                const nomeCentro = item.centroId === SEDE ? 'Sede / Matriz' : obra?.nome || item.centroId;
                const corCentro = item.centroId === SEDE ? '#64748B' : obra?.cor || '#FF6B00';

                return (
                  <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap tabular-nums text-xs font-medium text-fg">
                      {fmtDate(item.data)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {item.tipo === 'entrada' ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-500">
                          <ArrowDownLeft className="size-3.5" /> Entrada
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-red-500">
                          <ArrowUpRight className="size-3.5" /> Saída
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-fg">{item.descricao}</div>
                      {item.documento && (
                        <div className="text-xs text-muted print:text-slate-600">Doc: {item.documento}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-fg">
                      {item.entidade}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Badge tone="neutral">{LABEL_CATEGORIA_GASTO[item.categoria] || item.categoria}</Badge>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full shrink-0" style={{ background: corCentro }} />
                        <span className="text-xs font-medium text-fg">{nomeCentro}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <Badge tone={item.status === 'liquidado' ? 'green' : 'amber'}>
                        {item.status === 'liquidado' ? 'Liquidado' : 'Pendente'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <span
                        className={`font-bold tabular-nums ${
                          item.tipo === 'entrada' ? 'text-emerald-500' : 'text-fg'
                        }`}
                      >
                        {item.tipo === 'entrada' ? `+${fmtBRL(item.valor)}` : `−${fmtBRL(item.valor)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted">
                    Nenhum lançamento encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
