import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { ContaPagar, FormaPagamento } from '@/domain/types';
import { LABEL_FORMA_PAGAMENTO } from '@/domain/labels';
import { today } from '@/lib/dates';
import { fmtBRL, fmtDate } from '@/lib/format';

interface BaixarContaPagarDialogProps {
  conta: ContaPagar | null;
  onClose: () => void;
}

export function BaixarContaPagarDialog({ conta, onClose }: BaixarContaPagarDialogProps) {
  const mutate = useErp((s) => s.mutate);
  const [dataPagamento, setDataPagamento] = useState(today());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [comprovante, setComprovante] = useState('');

  if (!conta) return null;

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(
      (d) => {
        const item = d.contasPagar.find((c) => c.id === conta.id);
        if (item) {
          item.status = 'pago';
          item.dataPagamento = dataPagamento;
          item.formaPagamento = formaPagamento;
          if (comprovante.trim()) {
            item.documento = comprovante.trim();
          }
        }
      },
      {
        acao: 'Contas a Pagar',
        descricao: `Efetuou baixa/pagamento de "${conta.descricao}" no valor de ${fmtBRL(conta.valor)} via ${LABEL_FORMA_PAGAMENTO[formaPagamento]}`,
      },
    );

    toast(`Pagamento de ${fmtBRL(conta.valor)} registrado com sucesso!`);
    onClose();
  };

  return (
    <Dialog
      open={!!conta}
      onClose={onClose}
      title="Baixar Conta a Pagar"
      subtitle={`Descrição: ${conta.descricao} • Vencimento: ${fmtDate(conta.vencimento)}`}
    >
      <form onSubmit={confirmar} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-center">
          <span className="text-xs text-muted">Valor a Liquidar</span>
          <div className="text-2xl font-bold text-fg">{fmtBRL(conta.valor)}</div>
        </div>

        <Field label="Data do Pagamento">
          <Input type="date" required value={dataPagamento} max={today()} onChange={(e) => setDataPagamento(e.target.value)} />
        </Field>

        <Field label="Forma de Pagamento">
          <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}>
            {(Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => (
              <option key={f} value={f}>
                {LABEL_FORMA_PAGAMENTO[f]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Comprovante / Autenticação Bancária (Texto)">
          <Input
            placeholder="Ex.: Autenticação Pix #883921 ou NF 19.442"
            value={comprovante}
            onChange={(e) => setComprovante(e.target.value)}
          />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar Pagamento</Button>
        </div>
      </form>
    </Dialog>
  );
}
