import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Locacao } from '@/domain/types';
import { custoLocacao } from '@/domain/engine';
import { today, addDays } from '@/lib/dates';
import { fmtBRL, fmtDate, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

interface DevolverLocacaoDialogProps {
  locacao: Locacao | null;
  modo: 'devolver' | 'faturar';
  onClose: () => void;
}

export function DevolverLocacaoDialog({ locacao, modo, onClose }: DevolverLocacaoDialogProps) {
  const mutate = useErp((s) => s.mutate);
  const [dataApuracao, setDataApuracao] = useState(today());
  const [prazoVencimento, setPrazoVencimento] = useState('15');

  if (!locacao) return null;

  const custoTotalCalculado = custoLocacao(
    { ...locacao, dataDevolucao: modo === 'devolver' ? dataApuracao : undefined },
    dataApuracao
  );
  const valorAFaturar = Math.max(0, round2(custoTotalCalculado - locacao.valorFaturado));

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    const diasVenc = parseInt(prazoVencimento, 10) || 15;
    const dataVenc = addDays(dataApuracao, diasVenc);

    mutate(
      (d) => {
        const item = d.locacoes.find((l) => l.id === locacao.id);
        if (!item) return;

        if (modo === 'devolver') {
          item.status = 'devolvida';
          item.dataDevolucao = dataApuracao;
        }

        if (valorAFaturar > 0) {
          item.valorFaturado = round2(item.valorFaturado + valorAFaturar);

          // Gerar Conta a Pagar para a locadora
          d.contasPagar.push({
            id: uid('cp'),
            descricao: `Locação ${item.equipamento} (${modo === 'devolver' ? 'Devolução final' : 'Medição periódica'})`,
            categoria: 'locacao',
            fornecedorId: item.fornecedorId,
            valor: valorAFaturar,
            vencimento: dataVenc,
            parcela: 1,
            totalParcelas: 1,
            status: 'pendente',
            documento: '',
            origem: 'locacao',
            origemId: item.id,
            distribuicao: [{ centroId: item.obraId, valor: valorAFaturar }],
            criadoEm: new Date().toISOString(),
          });
        }
      },
      {
        acao: 'Locação',
        descricao: `${modo === 'devolver' ? 'Devolveu' : 'Faturou medição de'} "${locacao.equipamento}" — Faturado ${fmtBRL(valorAFaturar)} em Contas a Pagar`,
      },
    );

    toast(
      modo === 'devolver'
        ? `Equipamento ${locacao.equipamento} devolvido com sucesso!`
        : `Fatura de ${fmtBRL(valorAFaturar)} gerada para o fornecedor!`
    );
    onClose();
  };

  return (
    <Dialog
      open={!!locacao}
      onClose={onClose}
      title={modo === 'devolver' ? 'Devolução de Equipamento' : 'Faturar Medição de Locação'}
      subtitle={`Equipamento: ${locacao.equipamento}`}
    >
      <form onSubmit={confirmar} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted">Data de Retirada:</span>
            <span className="font-semibold">{fmtDate(locacao.dataRetirada)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Total Acumulado Calculado:</span>
            <span className="font-semibold text-fg">{fmtBRL(custoTotalCalculado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Já Faturado Anteriormente:</span>
            <span className="font-semibold text-muted">{fmtBRL(locacao.valorFaturado)}</span>
          </div>
          <div className="flex justify-between border-t border-line/60 pt-1.5 font-bold text-sm">
            <span className="text-brand">Saldo a Faturar Agora:</span>
            <span className="text-brand">{fmtBRL(valorAFaturar)}</span>
          </div>
        </div>

        <Field label={modo === 'devolver' ? 'Data Efetiva de Devolução' : 'Data de Corte da Medição'}>
          <Input
            type="date"
            required
            value={dataApuracao}
            min={locacao.dataRetirada}
            max={today()}
            onChange={(e) => setDataApuracao(e.target.value)}
          />
        </Field>

        {valorAFaturar > 0 && (
          <Field label="Prazo de Vencimento da Conta a Pagar (em dias)">
            <Input
              type="number"
              min="0"
              required
              value={prazoVencimento}
              onChange={(e) => setPrazoVencimento(e.target.value)}
            />
          </Field>
        )}

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {modo === 'devolver' ? 'Confirmar Devolução' : 'Gerar Conta a Pagar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
