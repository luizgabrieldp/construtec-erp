import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp } from '@/data/store';
import type { Obra, ObraStatus, ObraFase } from '@/domain/types';
import { LABEL_OBRA_STATUS } from '@/domain/labels';
import { today, addMonths } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { fmtBRL, round2 } from '@/lib/format';
import { FaseObraStepper } from './FaseObraStepper';

interface ObraFormDialogProps {
  open: boolean;
  onClose: () => void;
  obraParaEditar?: Obra | null;
}

const CORES_DISPONIVEIS = ['#FF6B00', '#38BDF8', '#A78BFA', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

export function ObraFormDialog({ open, onClose, obraParaEditar }: ObraFormDialogProps) {
  const mutate = useErp((s) => s.mutate);

  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [arquiteto, setArquiteto] = useState('');
  const [dataInicio, setDataInicio] = useState(today());
  const [previsaoEntrega, setPrevisaoEntrega] = useState(addMonths(today(), 12));
  const [orcamento, setOrcamento] = useState('');
  const [valorContrato, setValorContrato] = useState('');
  const [status, setStatus] = useState<ObraStatus>('andamento');
  const [fase, setFase] = useState<ObraFase>('fundacao');
  const [cor, setCor] = useState(CORES_DISPONIVEIS[0]);

  useEffect(() => {
    if (obraParaEditar) {
      setNome(obraParaEditar.nome);
      setCliente(obraParaEditar.cliente);
      setEndereco(obraParaEditar.endereco);
      setResponsavel(obraParaEditar.responsavel || '');
      setArquiteto(obraParaEditar.arquiteto || '');
      setDataInicio(obraParaEditar.dataInicio);
      setPrevisaoEntrega(obraParaEditar.previsaoEntrega);
      setOrcamento(obraParaEditar.orcamento ? String(obraParaEditar.orcamento) : '');
      setValorContrato(obraParaEditar.valorContrato ? String(obraParaEditar.valorContrato) : '');
      setStatus(obraParaEditar.status);
      setFase(obraParaEditar.fase || 'fundacao');
      setCor(obraParaEditar.cor);
    } else {
      setNome('');
      setCliente('');
      setEndereco('');
      setResponsavel('');
      setArquiteto('');
      setDataInicio(today());
      setPrevisaoEntrega(addMonths(today(), 12));
      setOrcamento('');
      setValorContrato('');
      setStatus('andamento');
      setFase('fundacao');
      setCor(CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)]);
    }
  }, [obraParaEditar, open]);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const orcNum = round2(Number(orcamento.replace(',', '.')) || 0);
    const contratoNum = round2(Number(valorContrato.replace(',', '.')) || 0);

    if (!nome.trim()) return;

    if (obraParaEditar) {
      mutate(
        (d) => {
          const idx = d.obras.findIndex((o) => o.id === obraParaEditar.id);
          if (idx !== -1) {
            d.obras[idx] = {
              ...d.obras[idx],
              nome: nome.trim(),
              cliente: cliente.trim(),
              endereco: endereco.trim(),
              responsavel: responsavel.trim() || undefined,
              arquiteto: arquiteto.trim() || undefined,
              dataInicio,
              previsaoEntrega,
              orcamento: orcNum,
              valorContrato: contratoNum,
              status,
              fase,
              cor,
            };
          }
        },
        { acao: 'Obras', descricao: `Atualizou dados da obra "${nome.trim()}"` },
      );
      toast(`Obra "${nome.trim()}" atualizada com sucesso`);
    } else {
      const nova: Obra = {
        id: uid('o'),
        nome: nome.trim(),
        cliente: cliente.trim(),
        endereco: endereco.trim(),
        responsavel: responsavel.trim() || undefined,
        arquiteto: arquiteto.trim() || undefined,
        dataInicio,
        previsaoEntrega,
        orcamento: orcNum,
        valorContrato: contratoNum,
        status,
        fase,
        cor,
      };
      mutate(
        (d) => {
          d.obras.push(nova);
        },
        { acao: 'Obras', descricao: `Cadastrou nova obra "${nome.trim()}"` },
      );
      toast(`Obra "${nome.trim()}" cadastrada`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={obraParaEditar ? 'Editar Obra' : 'Nova Obra'}
      subtitle="Defina o cronograma, fase atual e responsáveis da obra"
      wide
    >
      <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da Obra / Empreendimento" className="sm:col-span-2">
          <Input required placeholder="Ex.: Residencial Vista Mar" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>

        {/* Fases da Obra Clicável */}
        <div className="sm:col-span-2 rounded-xl border border-line bg-surface-2/40 p-3">
          <FaseObraStepper faseAtual={fase} onChange={(nova) => setFase(nova)} />
        </div>

        <Field label="Cliente / Contratante (opcional)">
          <Input placeholder="Ex.: SPE ou Nome do Proprietário" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </Field>

        <Field label="Status Operacional">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ObraStatus)}>
            {(['planejamento', 'andamento', 'pausada', 'concluida'] as ObraStatus[]).map((st) => (
              <option key={st} value={st}>
                {LABEL_OBRA_STATUS[st]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Engenheiro / Responsável Técnico (opcional)">
          <Input placeholder="Ex.: Eng. Carlos Silva" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </Field>

        <Field label="Arquiteto Responsável (opcional)">
          <Input placeholder="Ex.: Arq. Marina Costa" value={arquiteto} onChange={(e) => setArquiteto(e.target.value)} />
        </Field>

        <Field label="Endereço (opcional)" className="sm:col-span-2">
          <Input placeholder="Rua, número, bairro, cidade" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </Field>

        <Field label="Data de Início">
          <Input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </Field>
        <Field label="Previsão de Entrega (padrão: 1 ano)">
          <Input type="date" required value={previsaoEntrega} onChange={(e) => setPrevisaoEntrega(e.target.value)} />
        </Field>

        <Field label="Orçamento Previsto (R$) (opcional)">
          <Input
            inputMode="decimal"
            placeholder="Ex.: 500000"
            value={orcamento}
            onChange={(e) => setOrcamento(e.target.value.replace(/[^\d,.]/g, ''))}
          />
        </Field>

        <Field label="Valor do Contrato (R$) (opcional)">
          <Input
            inputMode="decimal"
            placeholder="Ex.: 680000"
            value={valorContrato}
            onChange={(e) => setValorContrato(e.target.value.replace(/[^\d,.]/g, ''))}
          />
        </Field>

        <Field label="Cor de Identificação">
          <div className="flex items-center gap-2 pt-1">
            {CORES_DISPONIVEIS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                style={{ backgroundColor: c }}
                className={`size-7 rounded-full border-2 transition-transform ${cor === c ? 'scale-110 border-fg' : 'border-transparent'}`}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </Field>

        <div className="flex gap-2 pt-3 sm:col-span-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {obraParaEditar ? 'Salvar Alterações' : 'Cadastrar Obra'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
