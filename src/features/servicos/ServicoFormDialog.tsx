import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Wrench, AlertCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import type { ServicoEmpreitada, EtapaServico, ContaPagar } from '@/domain/types';
import { today, addDays } from '@/lib/dates';
import { fmtBRL, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

interface ServicoFormDialogProps {
  open: boolean;
  onClose: () => void;
  servicoParaEditar?: ServicoEmpreitada | null;
  obraPadraoId?: string;
}

interface EtapaRascunho {
  id: string;
  descricao: string;
  valor: string;
  vencimento: string;
}

const FUNCOES_SUGERIDAS = [
  'Eletricista',
  'Pintor',
  'Gesseiro / Drywall',
  'Encanador / Hidráulica',
  'Carpinteiro / Marcenaria',
  'Serralheiro',
  'Marmorista / Granito',
  'Vidraceiro',
  'Impermeabilizador',
  'Pedreiro de Acabamento',
  'Outro',
];

export function ServicoFormDialog({
  open,
  onClose,
  servicoParaEditar,
  obraPadraoId,
}: ServicoFormDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);

  const [obraId, setObraId] = useState(obraPadraoId || data.obras[0]?.id || '');
  const [prestadorNome, setPrestadorNome] = useState('');
  const [prestadorContato, setPrestadorContato] = useState('');
  const [funcao, setFuncao] = useState('Eletricista');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [dataInicio, setDataInicio] = useState(today());
  const [previsaoEntrega, setPrevisaoEntrega] = useState(addDays(today(), 30));
  const [modoPagamento, setModoPagamento] = useState<'unica' | 'etapas'>('unica');

  // Etapas de pagamento
  const [etapas, setEtapas] = useState<EtapaRascunho[]>([
    { id: uid('temp'), descricao: 'Pagamento na entrega do serviço', valor: '', vencimento: addDays(today(), 30) },
  ]);

  useEffect(() => {
    if (servicoParaEditar) {
      setObraId(servicoParaEditar.obraId);
      setPrestadorNome(servicoParaEditar.prestadorNome);
      setPrestadorContato(servicoParaEditar.prestadorContato);
      setFuncao(servicoParaEditar.funcao);
      setDescricao(servicoParaEditar.descricao);
      setValorTotal(String(servicoParaEditar.valorTotal));
      setDataInicio(servicoParaEditar.dataInicio);
      setPrevisaoEntrega(servicoParaEditar.previsaoEntrega);
      if (servicoParaEditar.etapas.length > 1) {
        setModoPagamento('etapas');
        setEtapas(
          servicoParaEditar.etapas.map((e) => ({
            id: e.id,
            descricao: e.descricao,
            valor: String(e.valor),
            vencimento: e.vencimento,
          })),
        );
      } else if (servicoParaEditar.etapas.length === 1) {
        setModoPagamento('unica');
        setEtapas([
          {
            id: servicoParaEditar.etapas[0].id,
            descricao: servicoParaEditar.etapas[0].descricao,
            valor: String(servicoParaEditar.etapas[0].valor),
            vencimento: servicoParaEditar.etapas[0].vencimento,
          },
        ]);
      }
    } else {
      setObraId(obraPadraoId || data.obras[0]?.id || '');
      setPrestadorNome('');
      setPrestadorContato('');
      setFuncao('Eletricista');
      setDescricao('');
      setValorTotal('');
      setDataInicio(today());
      setPrevisaoEntrega(addDays(today(), 30));
      setModoPagamento('unica');
      setEtapas([
        { id: uid('temp'), descricao: 'Pagamento na entrega do serviço', valor: '', vencimento: addDays(today(), 30) },
      ]);
    }
  }, [servicoParaEditar, obraPadraoId, open, data.obras]);

  const vTotalNum = round2(Number(valorTotal.replace(',', '.')) || 0);

  // Sincronizar valor quando modo for parcela única
  const atualizarValorTotal = (val: string) => {
    setValorTotal(val);
    const n = round2(Number(val.replace(',', '.')) || 0);
    if (modoPagamento === 'unica') {
      setEtapas([
        {
          id: etapas[0]?.id || uid('temp'),
          descricao: 'Pagamento integral na entrega',
          valor: String(n > 0 ? n : ''),
          vencimento: previsaoEntrega,
        },
      ]);
    }
  };

  const mudarModoPagamento = (modo: 'unica' | 'etapas') => {
    setModoPagamento(modo);
    if (modo === 'unica') {
      setEtapas([
        {
          id: uid('temp'),
          descricao: 'Pagamento integral na entrega',
          valor: String(vTotalNum > 0 ? vTotalNum : ''),
          vencimento: previsaoEntrega,
        },
      ]);
    } else {
      // Cria rascunho de 2 etapas (50% / 50%)
      const metade = round2(vTotalNum / 2);
      setEtapas([
        { id: uid('temp'), descricao: 'Entrada no início do serviço', valor: String(metade || ''), vencimento: dataInicio },
        { id: uid('temp'), descricao: 'Saldo na conclusão e entrega', valor: String(round2(vTotalNum - metade) || ''), vencimento: previsaoEntrega },
      ]);
    }
  };

  const adicionarEtapa = () => {
    const somaAtual = etapas.reduce((s, e) => s + (Number(e.valor.replace(',', '.')) || 0), 0);
    const restante = Math.max(0, round2(vTotalNum - somaAtual));
    setEtapas([
      ...etapas,
      {
        id: uid('temp'),
        descricao: `Etapa ${etapas.length + 1}`,
        valor: restante > 0 ? String(restante) : '',
        vencimento: previsaoEntrega,
      },
    ]);
  };

  const removerEtapa = (idEtapa: string) => {
    if (etapas.length <= 1) return;
    setEtapas(etapas.filter((e) => e.id !== idEtapa));
  };

  const atualizarEtapa = (idEtapa: string, campo: keyof EtapaRascunho, valor: string) => {
    setEtapas(etapas.map((e) => (e.id === idEtapa ? { ...e, [campo]: valor } : e)));
  };

  const somaEtapas = round2(etapas.reduce((s, e) => s + (Number(e.valor.replace(',', '.')) || 0), 0));
  const diferenca = round2(vTotalNum - somaEtapas);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prestadorNome.trim()) {
      toast('Informe o nome do prestador ou empresa.', 'error');
      return;
    }
    if (!descricao.trim()) {
      toast('Informe a descrição do serviço a ser realizado.', 'error');
      return;
    }
    if (vTotalNum <= 0) {
      toast('Informe um valor total válido para a empreitada.', 'error');
      return;
    }
    if (Math.abs(diferenca) > 0.05) {
      toast(`A soma das parcelas (${fmtBRL(somaEtapas)}) não fecha com o valor total (${fmtBRL(vTotalNum)}).`, 'error');
      return;
    }

    const obraSel = data.obras.find((o) => o.id === obraId);

    mutate((d) => {
      const servId = servicoParaEditar ? servicoParaEditar.id : uid('srv');
      const novasEtapas: EtapaServico[] = [];

      etapas.forEach((eRasc, idx) => {
        const vEtapa = round2(Number(eRasc.valor.replace(',', '.')) || 0);
        let contaId = '';

        if (servicoParaEditar) {
          const etapaExistente = servicoParaEditar.etapas.find((x) => x.id === eRasc.id);
          if (etapaExistente?.contaPagarId) {
            contaId = etapaExistente.contaPagarId;
            const cIndex = d.contasPagar.findIndex((c) => c.id === contaId);
            if (cIndex >= 0) {
              d.contasPagar[cIndex].valor = vEtapa;
              d.contasPagar[cIndex].vencimento = eRasc.vencimento;
              d.contasPagar[cIndex].descricao = `Empreitada: ${descricao.trim()} (${idx + 1}/${etapas.length} - ${eRasc.descricao.trim()})`;
              d.contasPagar[cIndex].distribuicao = [{ centroId: obraId, valor: vEtapa }];
            }
          }
        }

        if (!contaId) {
          contaId = uid('cp');
          const novaConta: ContaPagar = {
            id: contaId,
            descricao: `Empreitada: ${descricao.trim()} (${idx + 1}/${etapas.length} - ${eRasc.descricao.trim()})`,
            categoria: 'servicos',
            valor: vEtapa,
            vencimento: eRasc.vencimento,
            parcela: idx + 1,
            totalParcelas: etapas.length,
            status: 'pendente',
            documento: '',
            origem: 'servico',
            origemId: servId,
            distribuicao: [{ centroId: obraId, valor: vEtapa }],
            criadoEm: new Date().toISOString(),
          };
          d.contasPagar.push(novaConta);
        }

        novasEtapas.push({
          id: eRasc.id.startsWith('temp') ? uid('etp') : eRasc.id,
          descricao: eRasc.descricao.trim() || `Parcela ${idx + 1}`,
          valor: vEtapa,
          vencimento: eRasc.vencimento,
          status: 'pendente',
          contaPagarId: contaId,
        });
      });

      const novoServico: ServicoEmpreitada = {
        id: servId,
        obraId,
        prestadorNome: prestadorNome.trim(),
        prestadorContato: prestadorContato.trim(),
        funcao,
        descricao: descricao.trim(),
        valorTotal: vTotalNum,
        dataInicio,
        previsaoEntrega,
        status: servicoParaEditar ? servicoParaEditar.status : 'andamento',
        etapas: novasEtapas,
        criadoEm: servicoParaEditar ? servicoParaEditar.criadoEm : new Date().toISOString(),
      };

      if (servicoParaEditar) {
        const idxS = d.servicos.findIndex((s) => s.id === servicoParaEditar.id);
        if (idxS >= 0) d.servicos[idxS] = novoServico;
      } else {
        d.servicos.push(novoServico);
      }
    }, {
      acao: servicoParaEditar ? 'Edição de Empreitada' : 'Novo Contrato de Serviço',
      descricao: `${servicoParaEditar ? 'Editou' : 'Cadastrou'} serviço "${descricao.trim()}" (${fmtBRL(vTotalNum)}) com ${prestadorNome.trim()} na obra ${obraSel?.nome}`,
    });

    toast(servicoParaEditar ? 'Contrato de serviço atualizado!' : 'Serviço por empreitada cadastrado com sucesso!');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={servicoParaEditar ? 'Editar Serviço / Empreitada' : 'Novo Serviço por Empreitada'}
      subtitle="Contratação de terceirizados por valor fechado, prazo e parcelamento de pagamento"
      wide
    >
      <form onSubmit={salvar} className="space-y-6">
        {/* Dados da Obra e Prestador */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Obra Destino">
            <Select value={obraId} onChange={(e) => setObraId(e.target.value)} required>
              {data.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Especialidade / Função">
            <Select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
              {FUNCOES_SUGERIDAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nome do Prestador / Empresa">
            <Input
              placeholder="Ex: Carlos Eletricista ME ou João Pintor"
              value={prestadorNome}
              onChange={(e) => setPrestadorNome(e.target.value)}
              required
            />
          </Field>

          <Field label="Contato / Telefone">
            <Input
              placeholder="(11) 98888-7777"
              value={prestadorContato}
              onChange={(e) => setPrestadorContato(e.target.value)}
            />
          </Field>
        </div>

        {/* Descrição e Prazos */}
        <div className="space-y-4">
          <Field label="Descrição e Escopo do Serviço">
            <Input
              placeholder="Ex: Instalação elétrica completa, quadros de distribuição e passagem de cabos"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor Total Acordado (R$)">
              <Input
                type="text"
                placeholder="0,00"
                value={valorTotal}
                onChange={(e) => atualizarValorTotal(e.target.value)}
                required
              />
            </Field>

            <Field label="Data de Início">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </Field>

            <Field label="Previsão de Conclusão">
              <Input
                type="date"
                value={previsaoEntrega}
                onChange={(e) => setPrevisaoEntrega(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        {/* Condições de Pagamento e Etapas */}
        <div className="rounded-2xl border border-line bg-surface-2/30 p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-fg">Forma de Pagamento</h4>
              <p className="text-xs text-muted">Defina como o valor contratado será quitado no financeiro</p>
            </div>
            <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => mudarModoPagamento('unica')}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  modoPagamento === 'unica' ? 'bg-brand text-white font-semibold' : 'text-muted'
                }`}
              >
                Parcela Única
              </button>
              <button
                type="button"
                onClick={() => mudarModoPagamento('etapas')}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  modoPagamento === 'etapas' ? 'bg-brand text-white font-semibold' : 'text-muted'
                }`}
              >
                Parcelado / Por Etapas
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {etapas.map((etp, idx) => (
              <div key={etp.id} className="grid grid-cols-12 gap-2 items-center bg-surface p-2.5 rounded-xl border border-line text-xs">
                <div className="col-span-5">
                  <Input
                    placeholder="Descrição da etapa (ex: Entrada 30%)"
                    value={etp.descricao}
                    onChange={(e) => atualizarEtapa(etp.id, 'descricao', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="text"
                    placeholder="Valor R$"
                    value={etp.valor}
                    onChange={(e) => atualizarEtapa(etp.id, 'valor', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="date"
                    value={etp.vencimento}
                    onChange={(e) => atualizarEtapa(etp.id, 'vencimento', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-1 text-right">
                  {modoPagamento === 'etapas' && etapas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerEtapa(etp.id)}
                      className="p-1 text-muted hover:text-red-500 transition-colors"
                      title="Remover etapa"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {modoPagamento === 'etapas' && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={adicionarEtapa}
              >
                Adicionar Etapa / Parcela
              </Button>

              <div className="text-right text-xs">
                <span className="text-muted">Total das etapas: </span>
                <span className="font-bold text-fg">{fmtBRL(somaEtapas)}</span>
                {Math.abs(diferenca) > 0.05 && (
                  <span className="ml-2 font-bold text-red-500">
                    ({diferenca > 0 ? `Falta ${fmtBRL(diferenca)}` : `Passou ${fmtBRL(Math.abs(diferenca))}`})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {servicoParaEditar ? 'Salvar Alterações' : 'Cadastrar Empreitada'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
