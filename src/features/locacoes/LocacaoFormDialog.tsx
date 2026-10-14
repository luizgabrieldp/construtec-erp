import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import type { Locacao, TarifaLocacao } from '@/domain/types';
import { LABEL_TARIFA } from '@/domain/labels';
import { today } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { round2 } from '@/lib/format';

interface LocacaoFormDialogProps {
  open: boolean;
  onClose: () => void;
}

const SUGESTOES_MAQUINAS = [
  'Betoneira 400L',
  'Retroescavadeira JCB 3CX',
  'Mini-carregadeira Bobcat S450',
  'Andaime tubular (módulo 1,5m)',
  'Compactador de solo (sapo)',
  'Caminhão Munck 12t',
  'Gerador de energia 55kVA',
  'Rompedor pneumático 30kg',
];

export function LocacaoFormDialog({ open, onClose }: LocacaoFormDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const [obraId, setObraId] = useState(data.obras[0]?.id || '');
  const [fornecedorId, setFornecedorId] = useState(
    data.fornecedores.find((f) => f.categoria === 'locacao')?.id || data.fornecedores[0]?.id || ''
  );
  const [equipamento, setEquipamento] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [tarifa, setTarifa] = useState<TarifaLocacao>('diaria');
  const [valor, setValor] = useState('');
  const [dataRetirada, setDataRetirada] = useState(today());

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const vNum = round2(Number(valor.replace(',', '.')) || 0);
    const qNum = Math.max(1, parseInt(quantidade, 10) || 1);

    if (!equipamento.trim() || !obraId || !fornecedorId || vNum <= 0) return;

    const nova: Locacao = {
      id: uid('loc'),
      obraId,
      fornecedorId,
      equipamento: equipamento.trim(),
      quantidade: qNum,
      tarifa,
      valor: vNum,
      dataRetirada,
      horas: [],
      valorFaturado: 0,
      status: 'ativa',
    };

    const nomeObra = data.obras.find((o) => o.id === obraId)?.nome;

    mutate(
      (d) => {
        d.locacoes.push(nova);
      },
      { acao: 'Locação', descricao: `Alugou "${equipamento.trim()}" (qtd: ${qNum}) para a obra ${nomeObra}` },
    );

    toast(`Locação de ${equipamento} cadastrada`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova Locação de Equipamento"
      subtitle="Cadastre o maquinário alugado, prazo de retirada e base de cálculo"
    >
      <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Equipamento / Máquina" className="sm:col-span-2">
          <Input
            required
            list="sugestoes-equipamentos"
            placeholder="Ex.: Betoneira 400L, Andaime tubular..."
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            autoFocus
          />
          <datalist id="sugestoes-equipamentos">
            {SUGESTOES_MAQUINAS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>

        <Field label="Obra de Destino">
          <Select value={obraId} onChange={(e) => setObraId(e.target.value)} required>
            {data.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fornecedor / Locadora">
          <Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required>
            {data.fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} ({f.categoria === 'locacao' ? 'Locadora' : 'Fornecedor'})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Quantidade de Itens">
          <Input
            type="number"
            min="1"
            required
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>

        <Field label="Tipo de Tarifa">
          <Select value={tarifa} onChange={(e) => setTarifa(e.target.value as TarifaLocacao)}>
            {(['diaria', 'mensal', 'hora'] as TarifaLocacao[]).map((t) => (
              <option key={t} value={t}>
                {LABEL_TARIFA[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valor Unitário da Tarifa (R$)">
          <Input
            required
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
          />
        </Field>

        <Field label="Data de Retirada / Início">
          <Input type="date" required value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-3 sm:col-span-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Cadastrar Locação</Button>
        </div>
      </form>
    </Dialog>
  );
}
