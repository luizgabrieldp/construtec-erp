import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Material, Unidade, CategoriaFornecedor } from '@/domain/types';
import { LABEL_UNIDADE, LABEL_CATEGORIA_FORNECEDOR } from '@/domain/labels';
import { uid } from '@/lib/utils';

interface MaterialFormDialogProps {
  open: boolean;
  onClose: () => void;
  materialParaEditar?: Material | null;
}

export function MaterialFormDialog({ open, onClose, materialParaEditar }: MaterialFormDialogProps) {
  const mutate = useErp((s) => s.mutate);

  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState<Unidade>('un');
  const [categoria, setCategoria] = useState<CategoriaFornecedor>('cimento');
  const [estoqueMinimo, setEstoqueMinimo] = useState('10');

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const minQtd = Math.max(0, parseInt(estoqueMinimo, 10) || 0);

    if (!nome.trim()) return;

    if (materialParaEditar) {
      mutate(
        (d) => {
          const idx = d.materiais.findIndex((m) => m.id === materialParaEditar.id);
          if (idx !== -1) {
            d.materiais[idx] = {
              ...d.materiais[idx],
              nome: nome.trim(),
              unidade,
              categoria,
              estoqueMinimo: minQtd,
            };
          }
        },
        { acao: 'Estoque', descricao: `Atualizou material "${nome.trim()}" no catálogo` },
      );
      toast(`Material "${nome.trim()}" atualizado`);
    } else {
      const novo: Material = {
        id: uid('m'),
        nome: nome.trim(),
        unidade,
        categoria,
        estoqueMinimo: minQtd,
      };
      mutate(
        (d) => {
          d.materiais.push(novo);
        },
        { acao: 'Estoque', descricao: `Cadastrou novo material "${nome.trim()}" no catálogo` },
      );
      toast(`Material "${nome.trim()}" cadastrado no catálogo`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={materialParaEditar ? 'Editar Material' : 'Novo Material no Catálogo'}
      subtitle="Defina o nome do insumo, unidade de medida e limite de estoque mínimo"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Nome do Material / Insumo">
          <Input
            required
            placeholder="Ex.: Cimento CP-II 50kg, Vergalhão 10mm..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unidade de Medida">
            <Select value={unidade} onChange={(e) => setUnidade(e.target.value as Unidade)}>
              {(Object.keys(LABEL_UNIDADE) as Unidade[]).map((u) => (
                <option key={u} value={u}>
                  {LABEL_UNIDADE[u]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoria">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaFornecedor)}>
              {(Object.keys(LABEL_CATEGORIA_FORNECEDOR) as CategoriaFornecedor[]).map((cat) => (
                <option key={cat} value={cat}>
                  {LABEL_CATEGORIA_FORNECEDOR[cat]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Estoque Mínimo de Segurança (Alerta)">
          <Input
            type="number"
            min="0"
            required
            value={estoqueMinimo}
            onChange={(e) => setEstoqueMinimo(e.target.value)}
          />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Material</Button>
        </div>
      </form>
    </Dialog>
  );
}
