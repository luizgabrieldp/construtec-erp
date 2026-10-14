import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Recorrencia } from '@/domain/types';
import { today } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

interface RecorrenciaFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RecorrenciaFormDialog({ open, onClose }: RecorrenciaFormDialogProps) {
  const mutate = useErp((s) => s.mutate);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const vNum = round2(Number(valor.replace(',', '.')) || 0);
    const diaNum = Math.min(31, Math.max(1, parseInt(diaVencimento, 10) || 10));

    if (!descricao.trim() || vNum <= 0) return;

    const nova: Recorrencia = {
      id: uid('rec'),
      descricao: descricao.trim(),
      categoria: 'sede_fixo',
      valor: vNum,
      diaVencimento: diaNum,
      inicio: today(),
      ativo: true,
    };

    mutate(
      (d) => {
        d.recorrencias.push(nova);
      },
      {
        acao: 'Recorrências',
        descricao: `Cadastrou despesa fixa recorrente "${descricao.trim()}" (${fmtBRL(vNum)}/mês, dia ${diaNum})`,
      },
    );

    toast(`Custo fixo recorrente cadastrado com sucesso!`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo Custo Fixo Recorrente da Sede"
      subtitle="Cadastre despesas mensais como aluguel do escritório, contabilidade, internet e pró-labore"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Descrição da Despesa Mensal">
          <Input
            required
            placeholder="Ex.: Aluguel do escritório comercial, Contador..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor Mensal (R$)">
            <Input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
            />
          </Field>

          <Field label="Dia do Vencimento (1 a 31)">
            <Input
              type="number"
              min="1"
              max="31"
              required
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Cadastrar Recorrência</Button>
        </div>
      </form>
    </Dialog>
  );
}
