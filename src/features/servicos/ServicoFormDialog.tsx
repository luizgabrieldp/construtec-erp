import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import { SEDE, type ServicoEmpreitada, type EtapaServico, type ContaPagar } from '@/domain/types';
import { today, addDays } from '@/lib/dates';
import { fmtBRL, parseMoedaBR, round2 } from '@/lib/format';
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
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [obraId, setObraId] = useState(obraPadraoId || data.obras[0]?.id || SEDE);
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
      setObraId(obraPadraoId || data.obras[0]?.id || SEDE);
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

  const vTotalNum = round2(parseMoedaBR(valorTotal));

  const paidEtapaIds = new Set(
    (servicoParaEditar?.etapas || [])
      .filter((etp) => {
        if (etp.status === 'pago') return true;
        if (etp.contaPagarId) {
          const conta = data.contasPagar.find((c) => c.id === etp.contaPagarId);
          return conta?.status === 'pago';
        }
        return false;
      })
      .map((etp) => etp.id),
  );
  const temEtapaPaga = paidEtapaIds.size > 0;

  // Sincronizar valor quando modo for parcela única
  const atualizarValorTotal = (val: string) => {
    setValorTotal(val);
    const n = round2(parseMoedaBR(val));
    if (modoPagamento === 'unica' && !(etapas[0] && paidEtapaIds.has(etapas[0].id))) {
      setEtapas([
        {
          id: etapas[0]?.id || uid('temp'),
          descricao: etapas[0]?.descricao || 'Pagamento integral na entrega',
          valor: String(n > 0 ? n : ''),
          vencimento: etapas[0]?.vencimento || previsaoEntrega,
        },
      ]);
    }
  };

  const mudarModoPagamento = (modo: 'unica' | 'etapas') => {
    if (modo === modoPagamento) return;
    if (temEtapaPaga) {
      toast('Não é possível alterar a forma de pagamento quando já existem parcelas pagas.', 'error');
      return;
    }
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
    const somaAtual = etapas.reduce((s, e) => s + parseMoedaBR(e.valor), 0);
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
    if (paidEtapaIds.has(idEtapa)) {
      toast('Não é possível remover uma etapa que já foi paga.', 'error');
      return;
    }
    setEtapas(etapas.filter((e) => e.id !== idEtapa));
  };

  const atualizarEtapa = (idEtapa: string, campo: keyof EtapaRascunho, valor: string) => {
    if (paidEtapaIds.has(idEtapa) && (campo === 'valor' || campo === 'vencimento')) {
      return;
    }
    setEtapas(etapas.map((e) => (e.id === idEtapa ? { ...e, [campo]: valor } : e)));
  };

  const somaEtapas = round2(etapas.reduce((s, e) => s + parseMoedaBR(e.valor), 0));
  const diferenca = round2(vTotalNum - somaEtapas);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast('Apenas administradores podem gerenciar contratos e empreitadas.', 'error');
      return;
    }

    if (!prestadorNome.trim()) {
      toast('Informe o nome do prestador ou empresa.', 'error');
      return;
    }
    if (!descricao.trim()) {
      toast('Informe a descrição do serviço a ser realizado.', 'error');
      return;
    }
    if (previsaoEntrega < dataInicio) {
      toast('A previsão de entrega não pode ser anterior à data de início.', 'error');
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

    const centroFinal = obraId || data.obras[0]?.id || SEDE;
    const obraSel = data.obras.find((o) => o.id === centroFinal);

    mutate((d) => {
      const servId = servicoParaEditar ? servicoParaEditar.id : uid('srv');
      const servicoExistente = servicoParaEditar
        ? d.servicos.find((s) => s.id === servicoParaEditar.id) ?? servicoParaEditar
        : null;
      const novasEtapas: EtapaServico[] = [];
      const contasMantidas = new Set<string>();

      etapas.forEach((eRasc, idx) => {
        const vEtapa = round2(parseMoedaBR(eRasc.valor));
        let contaId = '';
        let statusEtapa: EtapaServico['status'] = 'pendente';
        let valorEtapaFinal = vEtapa;
        let vencimentoEtapaFinal = eRasc.vencimento;

        if (servicoExistente) {
          const etapaExistente = servicoExistente.etapas.find((x) => x.id === eRasc.id);
          if (etapaExistente?.contaPagarId) {
            contaId = etapaExistente.contaPagarId;
            const cIndex = d.contasPagar.findIndex((c) => c.id === contaId);
            const contaExistente = cIndex >= 0 ? d.contasPagar[cIndex] : undefined;
            const jaPaga = etapaExistente.status === 'pago' || contaExistente?.status === 'pago';

            if (jaPaga) {
              statusEtapa = 'pago';
              valorEtapaFinal = etapaExistente.valor;
              vencimentoEtapaFinal = etapaExistente.vencimento;
            } else if (cIndex >= 0) {
              d.contasPagar[cIndex].valor = vEtapa;
              d.contasPagar[cIndex].vencimento = eRasc.vencimento;
              d.contasPagar[cIndex].parcela = idx + 1;
              d.contasPagar[cIndex].totalParcelas = etapas.length;
              d.contasPagar[cIndex].descricao = `Empreitada: ${descricao.trim()} (${idx + 1}/${etapas.length} - ${eRasc.descricao.trim()})`;
              d.contasPagar[cIndex].distribuicao = [{ centroId: centroFinal, valor: vEtapa }];
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
            distribuicao: [{ centroId: centroFinal, valor: vEtapa }],
            criadoEm: new Date().toISOString(),
          };
          d.contasPagar.push(novaConta);
        }

        contasMantidas.add(contaId);
        novasEtapas.push({
          id: eRasc.id.startsWith('temp') ? uid('etp') : eRasc.id,
          descricao: eRasc.descricao.trim() || `Parcela ${idx + 1}`,
          valor: valorEtapaFinal,
          vencimento: vencimentoEtapaFinal,
          status: statusEtapa,
          contaPagarId: contaId,
        });
      });

      if (servicoExistente) {
        // Remove contas pendentes órfãs que foram excluídas durante a edição
        d.contasPagar = d.contasPagar.filter(
          (c) => !(c.origem === 'servico' && c.origemId === servId && c.status === 'pendente' && !contasMantidas.has(c.id)),
        );
      }

      const novoServico: ServicoEmpreitada = {
        id: servId,
        obraId: centroFinal,
        prestadorNome: prestadorNome.trim(),
        prestadorContato: prestadorContato.trim(),
        funcao,
        descricao: descricao.trim(),
        valorTotal: vTotalNum,
        dataInicio,
        previsaoEntrega,
        status: servicoExistente ? servicoExistente.status : 'andamento',
        etapas: novasEtapas,
        criadoEm: servicoExistente ? servicoExistente.criadoEm : new Date().toISOString(),
      };

      if (servicoExistente) {
        const idxS = d.servicos.findIndex((s) => s.id === servicoExistente.id);
        if (idxS >= 0) d.servicos[idxS] = novoServico;
      } else {
        d.servicos.push(novoServico);
      }
    }, {
      acao: servicoParaEditar ? 'Edição de Empreitada' : 'Novo Contrato de Serviço',
      descricao: `${servicoParaEditar ? 'Editou' : 'Cadastrou'} serviço "${descricao.trim()}" (${fmtBRL(vTotalNum)}) com ${prestadorNome.trim()} na obra ${obraSel?.nome || 'Sede'}`,
    });

    toast(servicoParaEditar ? 'Contrato de serviço atualizado!' : 'Serviço por empreitada cadastrado com sucesso!');
    onClose();
  };

  if (!isAdmin) return null;

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
              {(data.obras.length === 0 || obraId === SEDE) && (
                <option value={SEDE}>Sede / Matriz</option>
              )}
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
            {etapas.map((etp) => {
              const isPaga = paidEtapaIds.has(etp.id);
              return (
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
                      disabled={isPaga}
                      title={isPaga ? 'Etapa já paga — valor bloqueado' : undefined}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="date"
                      value={etp.vencimento}
                      onChange={(e) => atualizarEtapa(etp.id, 'vencimento', e.target.value)}
                      disabled={isPaga}
                      title={isPaga ? 'Etapa já paga — vencimento bloqueado' : undefined}
                      required
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {isPaga ? (
                      <span className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                        Paga
                      </span>
                    ) : (
                      modoPagamento === 'etapas' && etapas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerEtapa(etp.id)}
                          className="p-1 text-muted hover:text-red-500 transition-colors"
                          title="Remover etapa"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
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
