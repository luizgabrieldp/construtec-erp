import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { SEDE, type Compra, type CentroId } from '@/domain/types';
import { compraTotal } from '@/domain/engine';
import { fmtBRL, fmtDate } from '@/lib/format';
import { LABEL_UNIDADE } from '@/domain/labels';

interface DetalhesCompraDialogProps {
  compra: Compra | null;
  onClose: () => void;
}

export function DetalhesCompraDialog({ compra, onClose }: DetalhesCompraDialogProps) {
  const data = useData();

  if (!compra) return null;

  const forn = data.fornecedores.find((f) => f.id === compra.fornecedorId);
  const total = compraTotal(compra);
  const contas = data.contasPagar.filter((c) => c.origemId === compra.id);

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Estoque Central';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  return (
    <Dialog
      open={!!compra}
      onClose={onClose}
      title={compra.descricao}
      subtitle={`Fornecedor: ${forn?.nome || '—'} • Doc: ${compra.documento} • Data: ${fmtDate(compra.data)}`}
      wide
    >
      <div className="space-y-6">
        {/* Itens */}
        <div className="rounded-xl border border-line p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-3">Itens Adquiridos</span>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qtd</th>
                <th className="py-2 text-right">Preço Unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {compra.itens.map((it) => {
                const mat = data.materiais.find((m) => m.id === it.materialId);
                return (
                  <tr key={it.id}>
                    <td className="py-2.5 font-medium text-fg">{mat?.nome}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {it.quantidade} {mat ? LABEL_UNIDADE[mat.unidade] : 'un'}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{fmtBRL(it.valorUnitario)}</td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-fg">
                      {fmtBRL(it.quantidade * it.valorUnitario)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-bold">
                <td colSpan={3} className="pt-3 text-right">Total da Compra:</td>
                <td className="pt-3 text-right text-brand text-sm">{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rateio por Destino */}
        <div className="rounded-xl border border-line p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-3">
            Rateio entre Centros de Custo
          </span>
          <div className="space-y-2">
            {compra.destinos.map((dest) => (
              <div key={dest.centroId} className="flex justify-between items-center rounded-lg bg-surface-2 p-2.5 text-xs">
                <span className="font-semibold text-fg">{getNomeCentro(dest.centroId)}</span>
                <div className="flex gap-4">
                  {Object.entries(dest.quantidades).map(([itemId, q]) => {
                    const item = compra.itens.find((i) => i.id === itemId);
                    const mat = data.materiais.find((m) => m.id === item?.materialId);
                    return (
                      <span key={itemId} className="text-muted">
                        <strong className="text-fg">{q}</strong> {mat ? LABEL_UNIDADE[mat.unidade] : 'un'} de {mat?.nome}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contas a Pagar Geradas */}
        <div className="rounded-xl border border-line p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-3">
            Parcelamento no Contas a Pagar
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {contas.map((cp) => (
              <div key={cp.id} className="rounded-xl border border-line p-3 text-xs bg-surface-2/40">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-fg">Parcela {cp.parcela}/{cp.totalParcelas}</span>
                  <Badge tone={cp.status === 'pago' ? 'green' : cp.status === 'cancelado' ? 'neutral' : 'amber'}>
                    {cp.status}
                  </Badge>
                </div>
                <div className="mt-2 text-base font-bold text-fg">{fmtBRL(cp.valor)}</div>
                <div className="text-[11px] text-muted mt-1">Vencimento: {fmtDate(cp.vencimento)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
