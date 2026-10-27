import { useState, useMemo } from 'react';
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
import { WhatsAppBadge } from '@/components/brand/WhatsAppIcon';
import { imprimirHtmlIframe, gerarHtmlReciboEmpreiteiro, type DadosEmpreiteiroImpressao } from '@/lib/print';

interface ReciboEmpreiteiroDialogProps {
  open: boolean;
  onClose: () => void;
  empreiteiroIdPadrao?: string;
  inicioPadrao?: string;
  fimPadrao?: string;
  tipoPadrao?: 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';
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

  const [tipo, setTipo] = useState<'semanal' | 'quinzenal' | 'mensal' | 'personalizado'>(tipoPadrao);
  const [inicio, setInicio] = useState(inicioPadrao || `${hoje.slice(0, 7)}-01`);
  const [fim, setFim] = useState(fimPadrao || `${hoje.slice(0, 7)}-15`);
  const [imprimindo, setImprimindo] = useState(false);

  const aplicarTipoPeriodo = (novoTipo: 'semanal' | 'quinzenal' | 'mensal' | 'personalizado') => {
    setTipo(novoTipo);
    if (novoTipo === 'mensal') {
      setInicio(startOfMonth(hoje));
      setFim(endOfMonth(hoje));
    } else if (novoTipo === 'semanal') {
      const sem = startOfWeek(hoje);
      setInicio(sem);
      setFim(addDays(sem, 6));
    } else if (novoTipo === 'personalizado') {
      // Mantém as datas atuais
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
    if (!empreiteiro) return;
    setImprimindo(true);

    const dadosImpressao: DadosEmpreiteiroImpressao = {
      empreiteiroNome: empreiteiro.nome,
      empreiteiroCpf: empreiteiro.cpf,
      empreiteiroTelefone: empreiteiro.telefone,
      empreiteiroPix: empreiteiro.chavePix,
      tipo,
      inicio,
      fim,
      dataEmissao: today(),
      itens: apuracaoEquipe.map((item) => ({
        nome: item.funcionario.nome,
        funcao: getLabelFuncao(item.funcionario.funcao),
        diasTrabalhados: item.diasTrabalhados,
        diaria: item.funcionario.regime === 'mensalista' ? item.funcionario.salario : item.funcionario.diaria,
        total: item.total,
        isEmpreiteiroProprio: item.isEmpreiteiroProprio,
      })),
      totalGeral: totalGeralConsolidado,
    };

    try {
      const html = gerarHtmlReciboEmpreiteiro(dadosImpressao);
      imprimirHtmlIframe(html, `Recibo Empreiteiro - ${empreiteiro.nome}`);
    } finally {
      setTimeout(() => setImprimindo(false), 500);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Impressão do Empreiteiro — Recibo Consolidado"
      subtitle="Gere o comprovante de repasse agrupado de toda a equipe vinculada ao empreiteiro no período"
      wide
    >
      <div className="space-y-6">
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
            <div className="flex items-center gap-3">
              <img src="/logo-emblema-trim.png" alt="CONSTRUTEC" className="size-10 object-contain shrink-0" />
              <div>
                <h3 className="text-lg font-black text-brand tracking-tight">CONSTRUTEC</h3>
                <p className="text-[11px] text-muted">Construção Civil & Reformas • CNPJ: 35.477.198/0001-83 • Petrolina/PE</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="orange">RECIBO CONSOLIDADO DO EMPREITEIRO ({tipo.toUpperCase()})</Badge>
                  <span className="text-xs font-semibold text-fg">
                    Período: {fmtDate(inicio)} a {fmtDate(fim)}
                  </span>
                </div>
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
                {empreiteiro.telefone ? (
                  <WhatsAppBadge telefone={empreiteiro.telefone} />
                ) : (
                  <span>Não informado</span>
                )}
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
              <div className="border-t border-line pt-1 font-semibold">CONSTRUTEC</div>
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
            disabled={!empreiteiro || apuracaoEquipe.length === 0 || imprimindo}
          >
            Imprimir Recibo do Empreiteiro
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
