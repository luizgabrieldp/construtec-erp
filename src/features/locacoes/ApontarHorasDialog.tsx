import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Locacao } from '@/domain/types';
import { today } from '@/lib/dates';
import { fmtDate } from '@/lib/format';

interface ApontarHorasDialogProps {
  locacao: Locacao | null;
  onClose: () => void;
}

export function ApontarHorasDialog({ locacao, onClose }: ApontarHorasDialogProps) {
  const mutate = useErp((s) => s.mutate);
  const [dataHora, setDataHora] = useState(today());
  const [horas, setHoras] = useState('8');

  if (!locacao) return null;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const hNum = Math.max(0.5, parseFloat(horas.replace(',', '.')) || 0);

    mutate(
      (d) => {
        const item = d.locacoes.find((l) => l.id === locacao.id);
        if (item) {
          // Se já houver apontamento na mesma data, soma ou atualiza
          const idx = item.horas.findIndex((h) => h.data === dataHora);
          if (idx !== -1) {
            item.horas[idx].horas += hNum;
          } else {
            item.horas.push({ data: dataHora, horas: hNum });
          }
        }
      },
      { acao: 'Locação', descricao: `Apontou ${hNum}h de operação para ${locacao.equipamento} em ${fmtDate(dataHora)}` },
    );

    toast(`${hNum} horas apontadas para ${locacao.equipamento}`);
    onClose();
  };

  return (
    <Dialog
      open={!!locacao}
      onClose={onClose}
      title="Apontar Horas de Operação"
      subtitle={`Equipamento: ${locacao.equipamento} • Tarifa: R$ ${locacao.valor}/hora`}
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Data de Operação">
          <Input type="date" required value={dataHora} max={today()} onChange={(e) => setDataHora(e.target.value)} />
        </Field>
        <Field label="Horas Trabalhadas">
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            required
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Apontamento</Button>
        </div>
      </form>
    </Dialog>
  );
}
