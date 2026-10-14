import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import { SEDE, type CentroId, type TipoMovimento, type MovimentoEstoque } from '@/domain/types';
import { LABEL_UNIDADE } from '@/domain/labels';
import { today } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { processarEstoque } from '@/domain/selectors';

interface MovimentarEstoqueDialogProps {
  open: boolean;
  onClose: () => void;
  materialPreSelecionadoId?: string;
  localPreSelecionadoId?: CentroId;
}

export function MovimentarEstoqueDialog({
  open,
  onClose,
  materialPreSelecionadoId,
  localPreSelecionadoId,
}: MovimentarEstoqueDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const isAdmin = useIsAdmin();

  const [tipo, setTipo] = useState<TipoMovimento>('saida');
  const [materialId, setMaterialId] = useState(materialPreSelecionadoId || data.materiais[0]?.id || '');
  const [localOrigem, setLocalOrigem] = useState<CentroId>(localPreSelecionadoId || data.obras[0]?.id || SEDE);
  const [localDestino, setLocalDestino] = useState<CentroId>(data.obras[1]?.id || SEDE);
  const [quantidade, setQuantidade] = useState('');
  const [dataMov, setDataMov] = useState(today());
  const [observacao, setObservacao] = useState('');

  const matSel = data.materiais.find((m) => m.id === materialId);
  const { estoque } = processarEstoque(data);
  const saldoAtualOrigem = estoque[localOrigem]?.[materialId]?.quantidade || 0;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const qNum = parseFloat(quantidade.replace(',', '.')) || 0;

    if (!materialId || qNum === 0) return;

    if (tipo !== 'ajuste' && qNum <= 0) {
      toast('A quantidade deve ser positiva', 'error');
      return;
    }

    if (tipo === 'transferencia' && localOrigem === localDestino) {
      toast('Origem e destino devem ser diferentes', 'error');
      return;
    }

    const novoMov: MovimentoEstoque = {
      id: uid('mv'),
      data: dataMov,
      tipo,
      materialId,
      local: localOrigem,
      destino: tipo === 'transferencia' ? localDestino : undefined,
      quantidade: qNum,
      observacao: observacao.trim() || (tipo === 'saida' ? 'Aplicação na obra' : tipo === 'transferencia' ? 'Remanejamento' : 'Ajuste de inventário'),
    };

    const nomeMat = matSel?.nome || 'Material';

    mutate(
      (d) => {
        d.movimentos.push(novoMov);
      },
      {
        acao: 'Estoque',
        descricao: `${tipo.toUpperCase()}: ${qNum} ${matSel?.unidade || 'un'} de "${nomeMat}"`,
      },
    );

    toast(`Movimentação de estoque registrada com sucesso!`);
    onClose();
  };

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Estoque Central';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Movimentar Estoque de Materiais"
      subtitle="Registre consumo no canteiro, remanejamento entre obras ou inventário físico"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Tipo de Movimentação">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
            <option value="saida">Saída / Consumo (Aplicação no canteiro)</option>
            <option value="transferencia">Transferência (Entre obras ou Sede)</option>
            <option value="ajuste">Inventário / Ajuste Físico (+ Sobra / - Perda)</option>
          </Select>
        </Field>

        <Field label="Material">
          <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)} required>
            {data.materiais.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} ({LABEL_UNIDADE[m.unidade]})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={tipo === 'transferencia' ? 'Local de Origem' : 'Local / Canteiro'}>
            <Select value={localOrigem} onChange={(e) => setLocalOrigem(e.target.value as CentroId)}>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
              {isAdmin && <option value={SEDE}>Sede / Estoque Central</option>}
            </Select>
            <span className="text-[10px] text-muted">
              Saldo atual no local: <strong className="text-fg">{saldoAtualOrigem} {matSel?.unidade}</strong>
            </span>
          </Field>

          {tipo === 'transferencia' && (
            <Field label="Local de Destino">
              <Select value={localDestino} onChange={(e) => setLocalDestino(e.target.value as CentroId)}>
                {data.obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
                {isAdmin && <option value={SEDE}>Sede / Estoque Central</option>}
              </Select>
            </Field>
          )}

          {tipo !== 'transferencia' && (
            <Field label="Data da Movimentação">
              <Input type="date" required value={dataMov} max={today()} onChange={(e) => setDataMov(e.target.value)} />
            </Field>
          )}
        </div>

        {tipo === 'transferencia' && (
          <Field label="Data da Transferência">
            <Input type="date" required value={dataMov} max={today()} onChange={(e) => setDataMov(e.target.value)} />
          </Field>
        )}

        <Field label={tipo === 'ajuste' ? 'Ajuste (+ para sobra, - para perda)' : `Quantidade a ${tipo === 'saida' ? 'baixar' : 'transferir'} (${matSel ? LABEL_UNIDADE[matSel.unidade] : 'un'})`}>
          <Input
            type="number"
            step="any"
            required
            placeholder={tipo === 'ajuste' ? 'Ex.: -5 para perda ou 10 para sobra' : 'Ex.: 50'}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>

        <Field label="Observação / Finalidade">
          <Textarea
            placeholder={
              tipo === 'saida'
                ? 'Ex.: Concretagem dos pilares da laje 2...'
                : tipo === 'transferencia'
                ? `Ex.: Remanejamento para a obra ${getNomeCentro(localDestino)}...`
                : 'Ex.: Contagem de inventário semanal...'
            }
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar Movimentação</Button>
        </div>
      </form>
    </Dialog>
  );
}
