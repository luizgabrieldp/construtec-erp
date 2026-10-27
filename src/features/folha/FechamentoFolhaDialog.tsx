import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje } from '@/hooks';
import { SEDE, type AjusteFolha, type FechamentoFolha, type TipoAjusteFolha, type CentroId } from '@/domain/types';
import { LABEL_AJUSTE, LABEL_FUNCAO } from '@/domain/labels';
import { calcularFolha } from '@/domain/engine';
import { addDays, endOfMonth, startOfMonth, startOfWeek, today } from '@/lib/dates';
import { fmtBRL, fmtDate, round2 } from '@/lib/format';
import { uid } from '@/lib/utils';

import { RecibosFolhaDialog, type DadosRecibo } from './RecibosFolhaDialog';

interface FechamentoFolhaDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FechamentoFolhaDialog({ open, onClose }: FechamentoFolhaDialogProps) {
  const data = useData();
  const hoje = useHoje();
  const mutate = useErp((s) => s.mutate);

  const [funcionarioId, setFuncionarioId] = useState(data.funcionarios[0]?.id || '');
  const [tipo, setTipo] = useState<'semanal' | 'quinzenal' | 'mensal' | 'personalizado'>('semanal');
  const [inicio, setInicio] = useState(startOfWeek(addDays(hoje, -7))); // Semana passada
  const [fim, setFim] = useState(addDays(startOfWeek(addDays(hoje, -7)), 6));
  const [vencimento, setVencimento] = useState(addDays(today(), 5));

  // Ajustes manuais (horas extras, vales, adiantamentos)
  const [ajustes, setAjustes] = useState<AjusteFolha[]>([]);
  const [novoAjusteTipo, setNovoAjusteTipo] = useState<TipoAjusteFolha>('hora_extra');
  const [novoAjusteDesc, setNovoAjusteDesc] = useState('');
  const [novoAjusteValor, setNovoAjusteValor] = useState('');

  const [reciboGerado, setReciboGerado] = useState<DadosRecibo | null>(null);

  const funcionario = data.funcionarios.find((f) => f.id === funcionarioId);

  const [quinzenaOpcao, setQuinzenaOpcao] = useState<string>('atual_1');

  const aplicarQuinzena = (opcao: string) => {
    setQuinzenaOpcao(opcao);
    const mesAtual = hoje.slice(0, 7);
    const mesAnteriorData = startOfMonth(addDays(startOfMonth(hoje), -1));
    const mesAnterior = mesAnteriorData.slice(0, 7);

    if (opcao === 'atual_1') {
      setInicio(`${mesAtual}-01`);
      setFim(`${mesAtual}-15`);
    } else if (opcao === 'atual_2') {
      setInicio(`${mesAtual}-16`);
      setFim(endOfMonth(hoje));
    } else if (opcao === 'anterior_2') {
      setInicio(`${mesAnterior}-16`);
      setFim(endOfMonth(mesAnteriorData));
    } else if (opcao === 'anterior_1') {
      setInicio(`${mesAnterior}-01`);
      setFim(`${mesAnterior}-15`);
    }
  };

  const trocarTipo = (novoTipo: 'semanal' | 'quinzenal' | 'mensal' | 'personalizado') => {
    setTipo(novoTipo);
    if (novoTipo === 'mensal') {
      const mesPassado = startOfMonth(addDays(hoje, -28));
      setInicio(mesPassado);
      setFim(endOfMonth(mesPassado));
    } else if (novoTipo === 'quinzenal') {
      aplicarQuinzena(quinzenaOpcao);
    } else if (novoTipo === 'personalizado') {
      // Mantém datas atuais prontas para edição
    } else {
      const semPassada = startOfWeek(addDays(hoje, -7));
      setInicio(semPassada);
      setFim(addDays(semPassada, 6));
    }
  };

  const addAjuste = () => {
    const v = round2(Number(novoAjusteValor.replace(',', '.')) || 0);
    if (!novoAjusteDesc.trim() || v === 0) return;

    // Se for vale ou desconto, torna negativo
    const finalV = novoAjusteTipo === 'vale' || novoAjusteTipo === 'adiantamento' || novoAjusteTipo === 'desconto'
      ? -Math.abs(v)
      : Math.abs(v);

    setAjustes([...ajustes, { id: uid('aj'), tipo: novoAjusteTipo, descricao: novoAjusteDesc.trim(), valor: finalV }]);
    setNovoAjusteDesc('');
    setNovoAjusteValor('');
  };

  const removeAjuste = (id: string) => {
    setAjustes(ajustes.filter((a) => a.id !== id));
  };

  const resultado = funcionario
    ? calcularFolha(funcionario, inicio, fim, data.apontamentos, ajustes, tipo)
    : null;

  const salvarFechamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionario || !resultado || resultado.total <= 0) return;

    const contaId = uid('cp');
    const fechamentoId = uid('fol');

    const novoFechamento: FechamentoFolha = {
      id: fechamentoId,
      funcionarioId: funcionario.id,
      tipo,
      inicio,
      fim,
      diasTrabalhados: resultado.diasTrabalhados,
      valorBase: resultado.valorBase,
      ajustes,
      total: resultado.total,
      distribuicao: resultado.distribuicao,
      contaPagarId: contaId,
      status: 'fechado',
      criadoEm: new Date().toISOString(),
    };

    mutate(
      (d) => {
        d.fechamentos.push(novoFechamento);

        // Gera a Conta a Pagar correspondente
        d.contasPagar.push({
          id: contaId,
          descricao: `Folha ${tipo} — ${funcionario.nome} (${fmtDate(inicio).slice(0, 5)} a ${fmtDate(fim).slice(0, 5)})`,
          categoria: 'mao_de_obra',
          funcionarioId: funcionario.id,
          valor: resultado.total,
          vencimento,
          parcela: 1,
          totalParcelas: 1,
          status: 'pendente',
          documento: '',
          origem: 'folha',
          origemId: fechamentoId,
          distribuicao: resultado.distribuicao,
          criadoEm: new Date().toISOString(),
        });
      },
      {
        acao: 'Folha',
        descricao: `Fechou folha ${tipo} de ${funcionario.nome} no valor de ${fmtBRL(resultado.total)}`,
      },
    );

    const novoRecibo: DadosRecibo = {
      id: fechamentoId,
      funcionarioNome: funcionario.nome,
      funcionarioFuncao: LABEL_FUNCAO[funcionario.funcao],
      funcionarioRegime: funcionario.regime,
      funcionarioTelefone: funcionario.telefone,
      tipo,
      inicio,
      fim,
      diasTrabalhados: resultado.diasTrabalhados,
      valorBase: resultado.valorBase,
      ajustes,
      total: resultado.total,
      obrasNomes: resultado.distribuicao.map((d) => getNomeCentro(d.centroId)),
      dataEmissao: new Date().toISOString().slice(0, 10),
    };

    setReciboGerado(novoRecibo);
    toast(`Folha de ${funcionario.nome} fechada! Recibo pronto para impressão.`);
  };

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Matriz';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  return (
    <>
      <Dialog
        open={open && !reciboGerado}
        onClose={onClose}
        title="Fechamento de Folha de Pagamento"
        subtitle="Apure os dias trabalhados, lance extras/vales e gere a conta a pagar com rateio por obra"
        wide
      >
        <form onSubmit={salvarFechamento} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Colaborador">
              <Select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)} required>
                {data.funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome} ({LABEL_FUNCAO[f.funcao]} - {f.regime})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo de Fechamento">
              <Select value={tipo} onChange={(e) => trocarTipo(e.target.value as 'semanal' | 'quinzenal' | 'mensal' | 'personalizado')}>
                <option value="semanal">Semanal (Diaristas)</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal (Mensalistas)</option>
                <option value="personalizado">Personalizado (Período Livre)</option>
              </Select>
            </Field>

            {tipo === 'quinzenal' && (
              <Field label="Quinzena de Apuração">
                <Select value={quinzenaOpcao} onChange={(e) => aplicarQuinzena(e.target.value)}>
                  <option value="atual_1">1ª Quinzena deste mês (Dia 01 a 15)</option>
                  <option value="atual_2">2ª Quinzena deste mês (Dia 16 ao fim)</option>
                  <option value="anterior_2">2ª Quinzena do mês anterior (Dia 16 ao fim)</option>
                  <option value="anterior_1">1ª Quinzena do mês anterior (Dia 01 a 15)</option>
                </Select>
              </Field>
            )}

          <Field label="Data Início do Período">
            <Input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Field>

          <Field label="Data Fim do Período">
            <Input type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
          </Field>
        </div>

        {/* Resumo do cálculo apurado */}
        {resultado && (
          <div className="rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 mb-3">
              <div>
                <span className="text-xs text-muted block">Dias Apontados no Período</span>
                <span className="text-lg font-bold text-fg">{resultado.diasTrabalhados} dias</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Valor Base Apurado</span>
                <span className="text-lg font-bold text-fg">{fmtBRL(resultado.valorBase)}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Extras / Descontos</span>
                <span className={`text-lg font-bold ${resultado.totalAjustes >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {resultado.totalAjustes >= 0 ? `+${fmtBRL(resultado.totalAjustes)}` : fmtBRL(resultado.totalAjustes)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Total Líquido da Folha</span>
                <span className="text-xl font-extrabold text-brand">{fmtBRL(resultado.total)}</span>
              </div>
            </div>

            {/* Demonstrativo do Rateio por Centro de Custo */}
            <div>
              <span className="text-xs font-bold text-muted uppercase block mb-1.5">
                Rateio Automático por Centro de Custo (Onde trabalhou)
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {resultado.distribuicao.map((dist) => (
                  <span key={dist.centroId} className="rounded-lg bg-surface px-2.5 py-1 border border-line">
                    <span className="font-semibold text-fg">{getNomeCentro(dist.centroId)}:</span>{' '}
                    <strong className="text-brand">{fmtBRL(dist.valor)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lançamento de Ajustes / Horas Extras / Vales */}
        <div className="rounded-xl border border-line p-4 bg-surface">
          <span className="text-sm font-bold text-fg block mb-2">Ajustes da Folha (Horas extras, vales e adiantamentos)</span>
          <div className="grid gap-2 sm:grid-cols-12 items-end mb-3">
            <div className="sm:col-span-3">
              <Select value={novoAjusteTipo} onChange={(e) => setNovoAjusteTipo(e.target.value as TipoAjusteFolha)}>
                {(Object.keys(LABEL_AJUSTE) as TipoAjusteFolha[]).map((t) => (
                  <option key={t} value={t}>
                    {LABEL_AJUSTE[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-5">
              <Input
                placeholder="Descrição (ex.: 4h extras de concretagem)"
                value={novoAjusteDesc}
                onChange={(e) => setNovoAjusteDesc(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                inputMode="decimal"
                placeholder="Valor (R$)"
                value={novoAjusteValor}
                onChange={(e) => setNovoAjusteValor(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button size="sm" variant="secondary" className="w-full" icon={<Plus className="size-3" />} onClick={addAjuste}>
                Adicionar
              </Button>
            </div>
          </div>

          {ajustes.length > 0 && (
            <ul className="space-y-1.5 border-t border-line/60 pt-2 text-xs">
              {ajustes.map((aj) => (
                <li key={aj.id} className="flex justify-between items-center bg-surface-2 p-2 rounded-lg">
                  <span>
                    <strong className="text-fg mr-2">[{LABEL_AJUSTE[aj.tipo]}]</strong>
                    {aj.descricao}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${aj.valor >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {fmtBRL(aj.valor)}
                    </span>
                    <button type="button" onClick={() => removeAjuste(aj.id)} className="text-muted hover:text-red-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="Data de Vencimento do Pagamento">
          <Input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!resultado || resultado.total <= 0}>
            Fechar Folha e Gerar Recibo
          </Button>
        </div>
      </form>
    </Dialog>

    {reciboGerado && (
      <RecibosFolhaDialog
        open={!!reciboGerado}
        onClose={() => {
          setReciboGerado(null);
          onClose();
        }}
        recibos={[reciboGerado]}
        titulo={`Recibo de Pagamento — ${reciboGerado.funcionarioNome}`}
      />
    )}
  </>
  );
}
