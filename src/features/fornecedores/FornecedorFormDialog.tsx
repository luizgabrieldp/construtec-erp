import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Fornecedor, CategoriaFornecedor } from '@/domain/types';
import { LABEL_CATEGORIA_FORNECEDOR } from '@/domain/labels';
import { uid } from '@/lib/utils';

interface FornecedorFormDialogProps {
  open: boolean;
  onClose: () => void;
  fornecedorParaEditar?: Fornecedor | null;
}

export function FornecedorFormDialog({ open, onClose, fornecedorParaEditar }: FornecedorFormDialogProps) {
  const mutate = useErp((s) => s.mutate);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaFornecedor>('areia_brita');
  const [cnpj, setCnpj] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('Natal/RN');

  useEffect(() => {
    if (fornecedorParaEditar) {
      setNome(fornecedorParaEditar.nome);
      setCategoria(fornecedorParaEditar.categoria);
      setCnpj(fornecedorParaEditar.cnpj);
      setContato(fornecedorParaEditar.contato);
      setTelefone(fornecedorParaEditar.telefone);
      setCidade(fornecedorParaEditar.cidade);
    } else {
      setNome('');
      setCategoria('areia_brita');
      setCnpj('');
      setContato('');
      setTelefone('');
      setCidade('Natal/RN');
    }
  }, [fornecedorParaEditar, open]);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    if (fornecedorParaEditar) {
      mutate(
        (d) => {
          const idx = d.fornecedores.findIndex((f) => f.id === fornecedorParaEditar.id);
          if (idx !== -1) {
            d.fornecedores[idx] = {
              ...d.fornecedores[idx],
              nome: nome.trim(),
              categoria,
              cnpj: cnpj.trim(),
              contato: contato.trim(),
              telefone: telefone.trim(),
              cidade: cidade.trim(),
            };
          }
        },
        { acao: 'Fornecedores', descricao: `Atualizou dados do fornecedor "${nome.trim()}"` },
      );
      toast(`Fornecedor "${nome.trim()}" atualizado`);
    } else {
      const novo: Fornecedor = {
        id: uid('f'),
        nome: nome.trim(),
        categoria,
        cnpj: cnpj.trim(),
        contato: contato.trim(),
        telefone: telefone.trim(),
        cidade: cidade.trim(),
      };
      mutate(
        (d) => {
          d.fornecedores.push(novo);
        },
        { acao: 'Fornecedores', descricao: `Cadastrou fornecedor "${nome.trim()}"` },
      );
      toast(`Fornecedor "${nome.trim()}" cadastrado`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fornecedorParaEditar ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      subtitle="Cadastre empresas parceiras, locadoras de máquinas e distribuidoras de insumos"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Razão Social / Nome Fantasia">
          <Input required placeholder="Ex.: Areal São Jorge Ltda." value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria de Atuação">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaFornecedor)}>
              {(Object.keys(LABEL_CATEGORIA_FORNECEDOR) as CategoriaFornecedor[]).map((cat) => (
                <option key={cat} value={cat}>
                  {LABEL_CATEGORIA_FORNECEDOR[cat]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="CNPJ">
            <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Pessoa de Contato">
            <Input placeholder="Ex.: Jorge Mendes" value={contato} onChange={(e) => setContato(e.target.value)} />
          </Field>

          <Field label="Telefone / WhatsApp">
            <Input placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </Field>
        </div>

        <Field label="Cidade / UF">
          <Input placeholder="Ex.: Natal/RN" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Fornecedor</Button>
        </div>
      </form>
    </Dialog>
  );
}
