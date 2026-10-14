import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Users, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button, Field, Input, Select, Badge } from '@/components/ui';
import { useData } from '@/data/store';
import { useHoje } from '@/hooks';
import type { Funcionario, CentroId } from '@/domain/types';
import { SEDE } from '@/domain/types';
import { getLabelFuncao } from '@/domain/labels';
import { calcularFolha } from '@/domain/engine';
import { addDays, startOfWeek, endOfMonth, startOfMonth, today } from '@/lib/dates';
import { fmtBRL, fmtDate, round2 } from '@/lib/format';

interface ReciboEmpreiteiroDialogProps {
  open: boolean;
  onClose: () => void;
  empreiteiroIdPadrao?: string;
  inicioPadrao?: string;
  fimPadrao?: string;
  tipoPadrao?: 'semanal' | 'quinzenal' | 'mensal';
}

export function ReciboEmpreiteiroDialog({
  open,
  onClose,
  empreiteiroIdPadrao,
  inicioPadrao,
  fimPadrao,
  tipoPadrao = 'quinzenal',
}: ReciboEmpreiteiroDialogProps) {
  const data = useData();
  const hoje = useHoje();

  // Empreiteiros cadastrados ou com colaboradores vinculados
  const empreiteiros = useMemo(() => {
    return data.funcionarios.filter(
      (f) =>
        f.funcao === 'empreiteiro' ||
        f.funcao.toLowerCase().includes('empreiteir') ||
        data.funcionarios.some((w) => w.empreiteiroId === f.id),
    );
  }, [data.funcionarios]);

  const [empreiteiroId, setEmpreiteiroId] = useState<string>(() => {
    return empreiteiroIdPadrao || empreiteiros[0]?.id || '';
  });

  const [tipo, setTipo] = useState<'semanal' | 'quinzenal' | 'mensal'>(tipoPadrao);
  const [inicio, setInicio] = useState(inicioPadrao || `${hoje.slice(0, 7)}-01`);
  const [fim, setFim] = useState(fimPadrao || `${hoje.slice(0, 7)}-15`);

  const aplicarTipoPeriodo = (novoTipo: 'semanal' | 'quinzenal' | 'mensal') => {
    setTipo(novoTipo);
    if (novoTipo === 'mensal') {
      setInicio(startOfMonth(hoje));
      setFim(endOfMonth(hoje));
    } else if (novoTipo === 'semanal') {
      const sem = startOfWeek(hoje);
      setInicio(sem);
      setFim(addDays(sem, 6));
    } else {
      const mesAtual = hoje.slice(0, 7);
      setInicio(`${mesAtual}-01`);
      setFim(`${mesAtual}-15`);
    }
  };

  // Empreiteiro selecionado
  const empreiteiro = empreiteiros.find((e) => e.id === empreiteiroId) || empreiteiros[0];

  // Colaboradores vinculados a este empreiteiro
  const equipeDoEmpreiteiro = useMemo(() => {
    if (!empreiteiro) return [];
    return data.funcionarios.filter(
      (f) => f.ativo && (f.empreiteiroId === empreiteiro.id || f.id === empreiteiro.id),
    );
  }, [data.funcionarios, empreiteiro]);

  // Apuração detalhada de cada colaborador da equipe
  const apuracaoEquipe = useMemo(() => {
    return equipeDoEmpreiteiro.map((f) => {
      const resultado = calcularFolha(f, inicio, fim, data.apontamentos, [], tipo);
      const obras = Array.from(
        new Set(
          resultado.distribuicao.map((d) => {
            if (d.centroId === SEDE) return 'Sede / Matriz';
            return data.obras.find((o) => o.id === d.centroId)?.nome || d.centroId;
          }),
        ),
      );

      return {
        funcionario: f,
        diasTrabalhados: resultado.diasTrabalhados,
        valorBase: resultado.valorBase,
        total: resultado.total,
        obrasNomes: obras.length > 0 ? obras : ['Canteiro Geral'],
        isEmpreiteiroProprio: f.id === empreiteiro?.id,
      };
    });
  }, [equipeDoEmpreiteiro, inicio, fim, data.apontamentos, data.obras, tipo, empreiteiro]);

  const totalGeralConsolidado = round2(
    apuracaoEquipe.reduce((sum, item) => sum + item.total, 0),
  );
  const totalDiasEquipe = apuracaoEquipe.reduce(
    (sum, item) => sum + item.diasTrabalhados,
    0,
  );

  const handleImprimir = () => {
    document.body.classList.add('imprimindo-recibos');
    const finalizar = () => {
      document.body.classList.remove('imprimindo-recibos');
    };
    window.addEventListener('afterprint', finalizar, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(finalizar, 2000);
    }, 50);
  };

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Impressão do Empreiteiro — Recibo Consolidado"
        subtitle="Gere o comprovante de repasse agrupado de toda a equipe vinculada ao empreiteiro no período"
        wide
      >
        <div className="space-y-6 no-print">
          {/* Controles de Seleção */}
          <div className="grid gap-3 sm:grid-cols-4 rounded-xl border border-line bg-surface-2 p-4">
            <Field label="Empreiteiro Responsável">
              <Select
                value={empreiteiro?.id || ''}
                onChange={(e) => setEmpreiteiroId(e.target.value)}
              >
                {empreiteiros.length === 0 && (
                  <option value="">Nenhum empreiteiro cadastrado</option>
                )}
                {empreiteiros.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} ({emp.telefone || 'Sem tel'})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Periodicidade">
              <Select
                value={tipo}
                onChange={(e) => aplicarTipoPeriodo(e.target.value as 'semanal' | 'quinzenal' | 'mensal')}
              >
                <option value="quinzenal">Quinzenal</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </Select>
            </Field>

            <Field label="Data de Início">
              <Input
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </Field>

            <Field label="Data de Fim">
              <Input
                type="date"
                required
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </Field>
          </div>

          {/* Pré-visualização do Recibo Consolidado na Tela */}
          <div className="rounded-xl border border-line bg-surface p-5 text-fg space-y-4 shadow-sm">
            {/* Topo do Recibo */}
            <div className="flex flex-wrap items-start justify-between border-b border-line pb-3 gap-3">
              <div>
                <h3 className="text-lg font-black text-brand tracking-tight">CONSTRUTEC</h3>
                <p className="text-[11px] text-muted">Construção Civil & Reformas • CNPJ: 12.345.678/0001-90</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="orange">RECIBO CONSOLIDADO DO EMPREITEIRO ({tipo.toUpperCase()})</Badge>
                  <span className="text-xs font-semibold text-fg">
                    Período: {fmtDate(inicio)} a {fmtDate(fim)}
                  </span>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-[10px] text-muted block uppercase font-bold">Valor Total Consolidado</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmtBRL(totalGeralConsolidado)}
                </span>
                <span className="text-[11px] text-muted block mt-0.5">
                  {apuracaoEquipe.length} colaboradores ({totalDiasEquipe} diárias)
                </span>
              </div>
            </div>

            {/* Dados do Empreiteiro */}
            {empreiteiro ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-surface-2/60 p-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Empreiteiro</span>
                  <strong className="text-fg">{empreiteiro.nome}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Telefone / WhatsApp</span>
                  <span>{empreiteiro.telefone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">CPF</span>
                  <span>{empreiteiro.cpf || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase font-bold">Chave Pix</span>
                  <span className="font-mono">{empreiteiro.chavePix || 'Não informada'}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted">
                Cadastre um colaborador com a função <strong>Empreiteiro</strong> na aba Equipe.
              </div>
            )}

            {/* Descritivo dos Colaboradores da Equipe */}
            <div className="border border-line rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b border-line font-semibold text-muted text-[11px]">
                  <tr>
                    <th className="p-2.5">Colaborador / Operário</th>
                    <th className="p-2.5">Função</th>
                    <th className="p-2.5 text-center">Dias Trabalhados</th>
                    <th className="p-2.5 text-right">Diária Base</th>
                    <th className="p-2.5 text-right">Valor Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {apuracaoEquipe.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted italic">
                        Nenhum operário vinculado a este empreiteiro no período.
                      </td>
                    </tr>
                  ) : (
                    apuracaoEquipe.map(({ funcionario, diasTrabalhados, total, isEmpreiteiroProprio }) => (
                      <tr key={funcionario.id} className="hover:bg-surface-2/40">
                        <td className="p-2.5">
                          <span className="font-semibold text-fg">{funcionario.nome}</span>
                          {isEmpreiteiroProprio && (
                            <Badge tone="neutral" className="ml-2 text-[10px]">
                              Empreiteiro Titular
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-muted">{getLabelFuncao(funcionario.funcao)}</td>
                        <td className="p-2.5 text-center font-bold tabular-nums">
                          {diasTrabalhados} {diasTrabalhados === 1 ? 'dia' : 'dias'}
                        </td>
                        <td className="p-2.5 text-right text-muted tabular-nums">
                          {funcionario.regime === 'mensalista' ? fmtBRL(funcionario.salario) : fmtBRL(funcionario.diaria)}
                        </td>
                        <td className="p-2.5 text-right font-black tabular-nums text-fg">
                          {fmtBRL(total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-surface-2/80 font-bold border-t border-line text-sm">
                  <tr>
                    <td colSpan={4} className="p-2.5 text-right">
                      VALOR TOTAL CONSOLIDADO PARA REPASSE:
                    </td>
                    <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">
                      {fmtBRL(totalGeralConsolidado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Termo de Repasse e Declaração */}
            <p className="text-[11px] text-muted italic border-l-2 border-brand pl-2 py-0.5">
              "Declaro ter recebido da CONSTRUTEC a quantia consolidada de {fmtBRL(totalGeralConsolidado)} para
              o devido repasse de diárias e remuneração à equipe sob minha coordenação acima descrita, referente
              ao período de {fmtDate(inicio)} a {fmtDate(fim)}."
            </p>

            {/* Linhas de Assinatura */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-t border-line pt-1 font-semibold">{empreiteiro?.nome || 'Empreiteiro'}</div>
                <div className="text-[10px] text-muted">Assinatura do Empreiteiro (Recebedor do Repasse)</div>
              </div>
              <div>
                <div className="border-t border-line pt-1 font-semibold">CONSTRUTEC ENGENHARIA</div>
                <div className="text-[10px] text-muted">Responsável Financeiro / Construtora</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="primary"
              icon={<Printer className="size-4" />}
              onClick={handleImprimir}
              disabled={!empreiteiro || apuracaoEquipe.length === 0}
            >
              Imprimir Recibo do Empreiteiro
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ÁREA DE IMPRESSÃO OFICIAL PARA EMPREITEIRO (A4) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="construtec-print-area">
            <div className="receipt-page font-sans text-black bg-white">
              {/* Topo do Recibo */}
              <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
                <div>
                  <h1 className="text-xl font-black tracking-tight leading-none">CONSTRUTEC</h1>
                  <p className="text-[10px] uppercase tracking-wider text-gray-700 mt-0.5">
                    Construção Civil & Reformas em Geral
                  </p>
                  <p className="text-[9px] text-gray-600">CNPJ: 12.345.678/0001-90 • Natal/RN</p>
                </div>
                <div className="text-right text-[10px]">
                  <div className="font-bold uppercase bg-gray-100 px-2 py-0.5 rounded border border-gray-400 inline-block">
                    RECIBO CONSOLIDADO DO EMPREITEIRO ({tipo.toUpperCase()})
                  </div>
                  <div className="mt-1">
                    <strong>Emissão:</strong> {fmtDate(today())}
                  </div>
                  <div>
                    <strong>Período:</strong> {fmtDate(inicio)} a {fmtDate(fim)}
                  </div>
                </div>
              </div>

              {/* Dados do Empreiteiro */}
              <div className="border border-gray-400 rounded p-2 text-[10px] grid grid-cols-2 gap-1.5 bg-gray-50 mb-2">
                <div>
                  <span className="text-[9px] uppercase text-gray-600 block font-bold">
                    Empreiteiro Responsável:
                  </span>
                  <span className="font-bold text-xs">{empreiteiro?.nome}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-gray-600 block font-bold">CPF / CNPJ:</span>
                  <span>{empreiteiro?.cpf || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-gray-600 block font-bold">
                    Telefone / WhatsApp:
                  </span>
                  <span>{empreiteiro?.telefone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-gray-600 block font-bold">Chave Pix:</span>
                  <span>{empreiteiro?.chavePix || 'Não informada'}</span>
                </div>
              </div>

              {/* Tabela de Operários e Valores Individuais */}
              <table className="w-full text-left text-[10px] border border-gray-400 border-collapse mb-2">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 font-bold">
                    <th className="p-1.5 border-r border-gray-400">Nome do Colaborador</th>
                    <th className="p-1.5 border-r border-gray-400">Função</th>
                    <th className="p-1.5 border-r border-gray-400 text-center w-24">Dias</th>
                    <th className="p-1.5 border-r border-gray-400 text-right w-24">Diária (R$)</th>
                    <th className="p-1.5 text-right w-28">Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {apuracaoEquipe.map(({ funcionario, diasTrabalhados, total, isEmpreiteiroProprio }, i) => (
                    <tr key={i} className="border-b border-gray-300">
                      <td className="p-1.5 border-r border-gray-300 font-medium">
                        {funcionario.nome} {isEmpreiteiroProprio ? '(Empreiteiro)' : ''}
                      </td>
                      <td className="p-1.5 border-r border-gray-300">{getLabelFuncao(funcionario.funcao)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center font-bold">
                        {diasTrabalhados}
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-right">
                        {funcionario.regime === 'mensalista' ? fmtBRL(funcionario.salario) : fmtBRL(funcionario.diaria)}
                      </td>
                      <td className="p-1.5 text-right font-bold">{fmtBRL(total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t border-black text-xs">
                    <td colSpan={4} className="p-1.5 text-right border-r border-gray-400 uppercase">
                      VALOR TOTAL CONSOLIDADO PARA REPASSE:
                    </td>
                    <td className="p-1.5 text-right font-black">{fmtBRL(totalGeralConsolidado)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Declaração de Quitação e Repasse */}
              <div className="border border-gray-300 p-2 rounded text-[9.5px] text-gray-800 leading-snug bg-gray-50 mb-4">
                Declaro que recebi da empresa <strong>CONSTRUTEC</strong> a quantia total consolidada de{' '}
                <strong>{fmtBRL(totalGeralConsolidado)}</strong> discriminada neste comprovante, correspondente
                ao repasse integral de diárias e serviços prestados pela equipe sob minha coordenação no período de{' '}
                <strong>{fmtDate(inicio)} a {fmtDate(fim)}</strong>, dando plena, rasa e irrevogável quitação.
              </div>

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-10 text-center text-[10px] pt-4">
                <div>
                  <div className="border-t border-black pt-1 w-52 mx-auto font-bold">
                    {empreiteiro?.nome}
                  </div>
                  <div className="text-[9px] text-gray-600">Assinatura do Empreiteiro</div>
                </div>
                <div>
                  <div className="border-t border-black pt-1 w-52 mx-auto font-bold">
                    CONSTRUTEC ENGENHARIA
                  </div>
                  <div className="text-[9px] text-gray-600">Construtora / Responsável Financeiro</div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
