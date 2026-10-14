import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useQuick } from '@/components/layout/quick';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import { SEDE, type CategoriaGasto, type CentroId, type FormaPagamento } from '@/domain/types';
import { LABEL_CATEGORIA_GASTO, LABEL_FORMA_PAGAMENTO } from '@/domain/labels';
import { today } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

const CATEGORIAS: CategoriaGasto[] = ['combustivel', 'alimentacao', 'frete', 'ferramentas', 'materiais', 'mao_de_obra', 'impostos', 'outros'];
const FORMAS: FormaPagamento[] = ['pix', 'dinheiro', 'cartao', 'transferencia', 'boleto'];

/**
 * Despesa avulsa de canteiro: lançada como JÁ PAGA (sai do caixa na hora)
 * e entra no custo do centro escolhido.
 */
export function DespesaRapidaDialog() {
  const open = useQuick((s) => s.despesa);
  const close = useQuick((s) => s.close);
  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const isAdmin = useIsAdmin();

  const obrasAtivas = data.obras.filter((o) => o.status === 'andamento' || o.status === 'pausada');
  const [centro, setCentro] = useState<CentroId>('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('combustivel');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const [dataDesp, setDataDesp] = useState(today());

  const centroSel = centro || obrasAtivas[0]?.id || SEDE;
  const valorNum = round2(Number(valor.replace(',', '.')) || 0);

  const reset = () => {
    setValor('');
    setDescricao('');
    setDataDesp(today());
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (valorNum <= 0 || !descricao.trim()) return;
    const nomeCentro = centroSel === SEDE ? 'Sede' : data.obras.find((o) => o.id === centroSel)?.nome;
    mutate(
      (d) => {
        d.contasPagar.push({
          id: uid('cp'),
          descricao: descricao.trim(),
          categoria,
          valor: valorNum,
          vencimento: dataDesp,
          parcela: 1,
          totalParcelas: 1,
          status: 'pago',
          dataPagamento: dataDesp,
          formaPagamento: forma,
          documento: '',
          origem: 'despesa',
          distribuicao: [{ centroId: centroSel, valor: valorNum }],
          criadoEm: new Date().toISOString(),
        });
      },
      { acao: 'Despesa', descricao: `Lançou despesa "${descricao.trim()}" de ${fmtBRL(valorNum)} em ${nomeCentro}` },
    );
    toast(`Despesa de ${fmtBRL(valorNum)} lançada em ${nomeCentro}`);
    reset();
    close('despesa');
  };

  return (
    <Dialog open={open} onClose={() => close('despesa')} title="Lançar despesa" subtitle="Despesa avulsa do canteiro — registrada como já paga">
      <form id="form-despesa" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Obra / centro de custo" className="sm:col-span-2">
          <Select value={centroSel} onChange={(e) => setCentro(e.target.value)}>
            {obrasAtivas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
            {isAdmin && <option value={SEDE}>Sede / Matriz</option>}
          </Select>
        </Field>
        <Field label="Descrição" className="sm:col-span-2">
          <Input required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Combustível do gerador" autoFocus />
        </Field>
        <Field label="Valor (R$)">
          <Input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" pattern="[0-9]+([,.][0-9]{1,2})?" />
        </Field>
        <Field label="Data">
          <Input type="date" required value={dataDesp} max={today()} onChange={(e) => setDataDesp(e.target.value)} />
        </Field>
        <Field label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {LABEL_CATEGORIA_GASTO[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>
                {LABEL_FORMA_PAGAMENTO[f]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2 pt-1 sm:col-span-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => close('despesa')}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" icon={<Receipt className="size-4" />} disabled={valorNum <= 0 || !descricao.trim()}>
            Lançar {valorNum > 0 ? fmtBRL(valorNum) : ''}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
