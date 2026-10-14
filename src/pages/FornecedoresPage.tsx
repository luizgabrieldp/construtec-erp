import { useState } from 'react';
import { Plus, Search, Truck, Phone, Building, Edit2 } from 'lucide-react';
import { Button, Input, PageHeader, Card, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import type { Fornecedor, CategoriaFornecedor } from '@/domain/types';
import { LABEL_CATEGORIA_FORNECEDOR } from '@/domain/labels';
import { fmtBRL } from '@/lib/format';
import { FornecedorFormDialog } from '@/features/fornecedores/FornecedorFormDialog';

export function FornecedoresPage() {
  const data = useData();
  const isAdmin = useIsAdmin();

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);

  const fornecedoresFiltrados = data.fornecedores.filter((f) => {
    const matchBusca =
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.contato.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj.includes(busca);
    const matchCat = categoriaFiltro === 'todas' || f.categoria === categoriaFiltro;
    return matchBusca && matchCat;
  });

  const abrirEdicao = (f: Fornecedor) => {
    setFornecedorEditando(f);
    setModalFormOpen(true);
  };

  const abrirNovo = () => {
    setFornecedorEditando(null);
    setModalFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Gestão de Fornecedores & Locadoras"
        subtitle="Cadastro de parceiros comerciais, distribuidoras de cimento, areia, ferragens e locação"
        actions={
          isAdmin && (
            <Button icon={<Plus className="size-4" />} onClick={abrirNovo}>
              Novo Fornecedor
            </Button>
          )
        }
      />

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <Input
            placeholder="Buscar por razão social, contato ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              categoriaFiltro === 'todas'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            Todas
          </button>
          {(Object.keys(LABEL_CATEGORIA_FORNECEDOR) as CategoriaFornecedor[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                categoriaFiltro === cat
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-surface-2 text-muted hover:text-fg'
              }`}
            >
              {LABEL_CATEGORIA_FORNECEDOR[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Fornecedores */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Fornecedor / Razão Social</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Contato & Telefone</th>
                <th className="px-4 py-3">Cidade / UF</th>
                <th className="px-4 py-3 text-right">Saldo Pendente a Pagar</th>
                <th className="px-4 py-3 text-right">Total Transacionado</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {fornecedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-xs">
                    <Truck className="mx-auto size-8 opacity-30 mb-2" />
                    Nenhum fornecedor encontrado no filtro.
                  </td>
                </tr>
              ) : (
                fornecedoresFiltrados.map((forn) => {
                  const contasDoForn = data.contasPagar.filter((c) => c.fornecedorId === forn.id && c.status !== 'cancelado');
                  const saldoPendente = contasDoForn
                    .filter((c) => c.status === 'pendente')
                    .reduce((s, c) => s + c.valor, 0);
                  const totalTransacionado = contasDoForn.reduce((s, c) => s + c.valor, 0);

                  return (
                    <tr key={forn.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-fg">{forn.nome}</div>
                        <div className="text-[11px] text-muted">{forn.cnpj || 'CNPJ não informado'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={forn.categoria === 'locacao' ? 'blue' : 'neutral'}>
                          {LABEL_CATEGORIA_FORNECEDOR[forn.categoria]}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-medium text-fg">{forn.contato || '—'}</div>
                        <div className="text-muted flex items-center gap-1 mt-0.5">
                          <Phone className="size-3" />
                          {forn.telefone || '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted">
                        <div className="flex items-center gap-1">
                          <Building className="size-3" />
                          {forn.cidade || '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                        {saldoPendente > 0 ? (
                          <span className="text-amber-500">{fmtBRL(saldoPendente)}</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">Em dia</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-fg">
                        {fmtBRL(totalTransacionado)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Edit2 className="size-3.5" />}
                            onClick={() => abrirEdicao(forn)}
                          >
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <FornecedorFormDialog
        open={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        fornecedorParaEditar={fornecedorEditando}
      />
    </>
  );
}
