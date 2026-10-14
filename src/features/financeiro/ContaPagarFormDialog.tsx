import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { SEDE, type CentroId, type CategoriaGasto } from '@/domain/types';
import { LABEL_CATEGORIA_GASTO } from '@/domain/labels';
import { today } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

interface ContaPagarFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContaPagarFormDialog({ open, onClose }: ContaPagarFormDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('outros');
  const [centroId, setCentroId] = useState<CentroId>(data.obras[0]?.id || SEDE);
  const [fornecedorId, setFornecedorId] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(today());
  const [documento, setDocumento] = useState('');

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const vNum = round2(Number(valor.replace(',', '.')) || 0);

    if (!descricao.trim() || vNum <= 0) return;

    mutate(
      (d) => {
        d.contasPagar.push({
          id: uid('cp'),
          descricao: descricao.trim(),
          categoria,
          fornecedorId: fornecedorId || undefined,
          valor: vNum,
          vencimento,
          parcela: 1,
          totalParcelas: 1,
          status: 'pendente',
          documento: documento.trim(),
          origem: 'manual',
          distribuicao: [{ centroId, valor: vNum }],
          criadoEm: new Date().toISOString(),
        });
      },
      {
        acao: 'Contas a Pagar',
        descricao: `Lançou conta a pagar manual "${descricao.trim()}" no valor de ${fmtBRL(vNum)}`,
      },
    );

    toast(`Conta "${descricao.trim()}" lançada com sucesso!`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nova Conta a Pagar"
      subtitle="Lance despesas avulsas, taxas de cartório, energia ou fornecedores eventuais"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Descrição da Conta / Boleto">
          <Input
            required
            placeholder="Ex.: Licença ambiental da obra, Conta de Energia..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}>
              {(Object.keys(LABEL_CATEGORIA_GASTO) as CategoriaGasto[]).map((cat) => (
                <option key={cat} value={cat}>
                  {LABEL_CATEGORIA_GASTO[cat]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Centro de Custo">
            <Select value={centroId} onChange={(e) => setCentroId(e.target.value as CentroId)}>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
              <option value={SEDE}>Sede / Matriz</option>
            </Select>
          </Field>
        </div>

        <Field label="Fornecedor Vinculado (Opcional)">
          <Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
            <option value="">Nenhum fornecedor cadastrado</option>
            {data.fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor (R$)">
            <Input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
            />
          </Field>

          <Field label="Data de Vencimento">
            <Input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </Field>
        </div>

        <Field label="Nº Documento / Código de Barras">
          <Input placeholder="Ex.: Boleto 103982 / Fatura" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Cadastrar Conta a Pagar</Button>
        </div>
      </form>
    </Dialog>
  );
}
