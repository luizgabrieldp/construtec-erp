import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { ContaReceber, FormaPagamento } from '@/domain/types';
import { LABEL_FORMA_PAGAMENTO } from '@/domain/labels';
import { today } from '@/lib/dates';
import { fmtBRL, fmtDate } from '@/lib/format';

interface BaixarRecebimentoDialogProps {
  conta: ContaReceber | null;
  onClose: () => void;
}

export function BaixarRecebimentoDialog({ conta, onClose }: BaixarRecebimentoDialogProps) {
  const mutate = useErp((s) => s.mutate);
  const [dataRecebimento, setDataRecebimento] = useState(today());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('transferencia');
  const [comprovante, setComprovante] = useState('');

  if (!conta) return null;

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(
      (d) => {
        const item = d.contasReceber.find((c) => c.id === conta.id);
        if (item) {
          item.status = 'recebido';
          item.dataRecebimento = dataRecebimento;
          item.formaPagamento = formaPagamento;
          if (comprovante.trim()) {
            item.documento = comprovante.trim();
          }
        }
      },
      {
        acao: 'Contas a Receber',
        descricao: `Recebeu medição de cliente "${conta.descricao}" no valor de ${fmtBRL(conta.valor)} (Entrada no Caixa Geral)`,
      },
    );

    toast(`Recebimento de ${fmtBRL(conta.valor)} creditado no Caixa Geral!`);
    onClose();
  };

  return (
    <Dialog
      open={!!conta}
      onClose={onClose}
      title="Confirmar Recebimento de Medição"
      subtitle={`Descrição: ${conta.descricao} • Vencimento original: ${fmtDate(conta.vencimento)}`}
    >
      <form onSubmit={confirmar} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-center">
          <span className="text-xs text-muted">Valor a Entrar no Caixa</span>
          <div className="text-2xl font-bold text-emerald-500">{fmtBRL(conta.valor)}</div>
        </div>

        <Field label="Data Efetiva do Crédito">
          <Input type="date" required value={dataRecebimento} max={today()} onChange={(e) => setDataRecebimento(e.target.value)} />
        </Field>

        <Field label="Forma de Recebimento">
          <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}>
            {(Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => (
              <option key={f} value={f}>
                {LABEL_FORMA_PAGAMENTO[f]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nº TED / Pix / Comprovante">
          <Input
            placeholder="Ex.: Comprovante TED Banco do Brasil"
            value={comprovante}
            onChange={(e) => setComprovante(e.target.value)}
          />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar Entrada no Caixa</Button>
        </div>
      </form>
    </Dialog>
  );
}
