import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  Plus,
  RotateCcw,
  ShieldAlert,
  Undo2,
  Users,
  Layers,
  Printer,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { useData, useErp } from '@/data/store';
import { useHoje, useIsAdmin } from '@/hooks';
import type { FechamentoFolha, FormaPagamento } from '@/domain/types';
import { getLabelFuncao, LABEL_FORMA_PAGAMENTO, LABEL_REGIME } from '@/domain/labels';
import { chaveApontamento, FATOR_PRESENCA, valorDia } from '@/domain/engine';
import { eachDay, startOfWeek, today } from '@/lib/dates';
import { TableWatermark } from '@/components/brand/TableWatermark';
import { fmtBRL, fmtDate, fmtDateShort, round2 } from '@/lib/format';
import { FechamentoFolhaDialog } from '@/features/folha/FechamentoFolhaDialog';
import { FechamentoFolhaLoteDialog } from '@/features/folha/FechamentoFolhaLoteDialog';
import { RecibosFolhaDialog, type DadosRecibo } from '@/features/folha/RecibosFolhaDialog';
import { ReciboEmpreiteiroDialog } from '@/features/folha/ReciboEmpreiteiroDialog';

export function FolhaPage() {
  const data = useData();
  const hoje = useHoje();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);

  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'previsao'>('historico');
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dialogNovoOpen, setDialogNovoOpen] = useState(false);
  const [dialogLoteOpen, setDialogLoteOpen] = useState(false);
  const [dialogEmpreiteiroOpen, setDialogEmpreiteiroOpen] = useState(false);
  const [fechamentoParaReabrir, setFechamentoParaReabrir] = useState<FechamentoFolha | null>(null);
  const [fechamentoParaBaixa, setFechamentoParaBaixa] = useState<FechamentoFolha | null>(null);
  const [baixaData, setBaixaData] = useState(() => today());
  const [baixaForma, setBaixaForma] = useState<FormaPagamento>('pix');
  const [fechamentoParaEstornar, setFechamentoParaEstornar] = useState<FechamentoFolha | null>(null);
  const [recibosParaVisualizar, setRecibosParaVisualizar] = useState<DadosRecibo[] | null>(null);

  const gerarDadosRecibo = (fech: FechamentoFolha): DadosRecibo => {
    const f = data.funcionarios.find((x) => x.id === fech.funcionarioId);
    const obrasNomes = fech.distribuicao.map((d) => {
      const o = data.obras.find((x) => x.id === d.centroId);
      return o ? o.nome : 'Sede';
    });

    return {
      id: fech.id,
      funcionarioNome: f?.nome || 'Colaborador',
      funcionarioFuncao: f ? getLabelFuncao(f.funcao) : 'Operário',
      funcionarioRegime: f?.regime || 'diarista',
      funcionarioTelefone: f?.telefone,
      tipo: fech.tipo,
      inicio: fech.inicio,
      fim: fech.fim,
      diasTrabalhados: fech.diasTrabalhados,
      valorBase: fech.valorBase,
      ajustes: fech.ajustes,
      total: fech.total,
      obrasNomes,
      dataEmissao: fech.criadoEm.slice(0, 10),
    };
  };

  // Se perfil for Encarregado, exibe aviso e direciona para Apontamento
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-fg">Acesso Restrito ao Financeiro</h2>
        <p className="mt-2 text-sm text-muted">
          O fechamento da folha e liquidação de pagamentos são de alçada administrativa e financeira.
          Como Encarregado de Obras, você pode registrar e consultar a frequência diária da sua equipe no canteiro.
        </p>
        <div className="mt-6">
          <Link to="/equipe">
            <Button variant="primary" icon={<HardHat className="size-4" />}>
              Ir para Grade de Apontamento
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Estatísticas da folha
  const contasFolha = data.contasPagar.filter((c) => c.origem === 'folha');
  const totalPendenteFolha = contasFolha
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + c.valor, 0);
  const totalPagoFolha = contasFolha
    .filter((c) => c.status === 'pago')
    .reduce((s, c) => s + c.valor, 0);

  // Lista filtrada de fechamentos
  const fechamentosFiltrados = data.fechamentos
    .filter((f) => {
      if (filtroFuncionario !== 'todos' && f.funcionarioId !== filtroFuncionario) return false;
      if (filtroTipo !== 'todos' && f.tipo !== filtroTipo) return false;
      return true;
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  // Previsão da semana atual para diaristas
  const semanaAtualInicio = startOfWeek(hoje);
  const diasSemanaAtual = eachDay(semanaAtualInicio, hoje);

  const previsaoColaboradores = data.funcionarios
    .filter((f) => f.ativo)
    .map((f) => {
      let diasTrabalhados = 0;
      const obrasOndeTrabalhou = new Set<string>();

      diasSemanaAtual.forEach((dia) => {
        const k = chaveApontamento(f.id, dia);
        const ap = data.apontamentos[k];
        if (ap) {
          diasTrabalhados += FATOR_PRESENCA[ap.status];
          if (ap.status !== 'falta') {
            const centros = ap.centroIds && ap.centroIds.length > 0 ? ap.centroIds : [ap.centroId];
            centros.forEach((cid) => obrasOndeTrabalhou.add(cid));
          }
        }
      });

      const valorPrevisto = round2(diasTrabalhados * valorDia(f, hoje));

      return {
        funcionario: f,
        diasTrabalhados,
        valorPrevisto,
        obras: Array.from(obrasOndeTrabalhou),
      };
    });

  // Ação de dar baixa (liquidar pagamento) na própria Folha
  const abrirModalBaixa = (fech: FechamentoFolha) => {
    setBaixaData(hoje);
    setBaixaForma('pix');
    setFechamentoParaBaixa(fech);
  };

  const executarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechamentoParaBaixa) return;
    const contaAtual = data.contasPagar.find((c) => c.id === fechamentoParaBaixa.contaPagarId);
    if (!contaAtual) {
      toast('Conta a pagar vinculada não encontrada.', 'error');
      setFechamentoParaBaixa(null);
      return;
    }
    const nomeColab = data.funcionarios.find((f) => f.id === fechamentoParaBaixa.funcionarioId)?.nome || 'Colaborador';
    mutate(
      (d) => {
        const conta = d.contasPagar.find((c) => c.id === fechamentoParaBaixa.contaPagarId);
        if (!conta) return;
        conta.status = 'pago';
        conta.dataPagamento = baixaData;
        conta.formaPagamento = baixaForma;
      },
      {
        acao: 'Folha',
        descricao: `Liquidou pagamento da folha de ${nomeColab} (${fmtBRL(fechamentoParaBaixa.total)}) via ${LABEL_FORMA_PAGAMENTO[baixaForma]}`,
      },
    );
    toast(`Pagamento de ${nomeColab} registrado com sucesso!`, 'success');
    setFechamentoParaBaixa(null);
  };

  // Ação de estornar pagamento na própria Folha
  const executarEstorno = (fech: FechamentoFolha) => {
    const contaAtual = data.contasPagar.find((c) => c.id === fech.contaPagarId);
    if (!contaAtual || contaAtual.status !== 'pago') {
      setFechamentoParaEstornar(null);
      return;
    }
    const nomeColab = data.funcionarios.find((f) => f.id === fech.funcionarioId)?.nome || 'Colaborador';
    mutate(
      (d) => {
        const conta = d.contasPagar.find((c) => c.id === fech.contaPagarId);
        if (!conta) return;
        conta.status = 'pendente';
        delete conta.dataPagamento;
        delete conta.formaPagamento;
      },
      {
        acao: 'Folha',
        descricao: `Estornou pagamento da folha de ${nomeColab} (${fmtBRL(fech.total)})`,
      },
    );
    toast('Pagamento estornado para pendente.', 'success');
    setFechamentoParaEstornar(null);
  };

  // Ação de reabrir fechamento
  const executarReabertura = (fech: FechamentoFolha) => {
    const contaAtual = data.contasPagar.find((c) => c.id === fech.contaPagarId);
    if (contaAtual && contaAtual.status === 'pago') {
      toast('Esta folha já foi paga e não pode ser reaberta diretamente. Estorne o pagamento primeiro usando o botão Estornar.', 'error');
      return;
    }

    const nomeColab = data.funcionarios.find((f) => f.id === fech.funcionarioId)?.nome || 'Colaborador';
    mutate(
      (d) => {
        const idxF = d.fechamentos.findIndex((x) => x.id === fech.id);
        if (idxF < 0) return;

        const cIndex = d.contasPagar.findIndex((c) => c.id === fech.contaPagarId);
        if (cIndex >= 0 && d.contasPagar[cIndex].status !== 'pago') {
          d.contasPagar.splice(cIndex, 1);
        }

        d.fechamentos.splice(idxF, 1);
      },
      {
        acao: 'Folha',
        descricao: `Reabriu fechamento de folha de ${nomeColab} (${fmtDateShort(fech.inicio)} a ${fmtDateShort(fech.fim)})`,
      },
    );
    toast('Folha reaberta com sucesso. O período pode ser recalculado.', 'success');
    setFechamentoParaReabrir(null);
  };

  return (
    <>
      <PageHeader
        title="Folha de Pagamento"
        subtitle="Fechamento de diárias, apuração de salários e apropriação de custos por obra"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {fechamentosFiltrados.length > 0 && (
              <Button
                variant="secondary"
                icon={<Printer className="size-4 text-brand" />}
                onClick={() => setRecibosParaVisualizar(fechamentosFiltrados.map(gerarDadosRecibo))}
                title="Visualizar e imprimir recibos individuais de quitação dos fechamentos"
              >
                Imprimir Recibos Individuais ({fechamentosFiltrados.length})
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<FileText className="size-4 text-brand" />}
              onClick={() => setDialogEmpreiteiroOpen(true)}
              title="Emitir e imprimir recibo consolidado do empreiteiro com descritivo da equipe"
            >
              Impressão do Empreiteiro
            </Button>
            <Button
              variant="secondary"
              icon={<Layers className="size-4 text-brand" />}
              onClick={() => setDialogLoteOpen(true)}
            >
              Fechar em Lote / Bloco
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setDialogNovoOpen(true)}
            >
              Novo Fechamento Individual
            </Button>
          </div>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Folha Pendente"
          value={fmtBRL(totalPendenteFolha)}
          icon={<DollarSign className="size-4 sm:size-5 text-amber-500" />}
          tone={totalPendenteFolha > 0 ? 'amber' : undefined}
          hint="Em aberto"
        />
        <StatCard
          label="Total Pago"
          value={fmtBRL(totalPagoFolha)}
          icon={<CheckCircle className="size-4 sm:size-5 text-emerald-500" />}
          tone="green"
          hint="Liquidado no histórico"
        />
        <StatCard
          label="Fechamentos"
          value={data.fechamentos.length}
          icon={<FileText className="size-4 sm:size-5 text-brand" />}
          hint={`${data.fechamentos.filter((f) => f.tipo === 'semanal').length} sem. · ${data.fechamentos.filter((f) => f.tipo === 'quinzenal').length} quinz. · ${data.fechamentos.filter((f) => f.tipo === 'mensal').length} mens.`}
        />
        <StatCard
          label="Equipe na Folha"
          value={data.funcionarios.filter((f) => f.ativo).length}
          icon={<Users className="size-4 sm:size-5 text-blue-500" />}
          tone="blue"
          hint="Profissionais ativos"
        />
      </div>

      {/* Abas */}
      <div className="mt-8 flex gap-2 border-b border-line pb-px">
        <button
          onClick={() => setAbaAtiva('historico')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            abaAtiva === 'historico'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          <FileText className="size-4" />
          Histórico de Fechamentos ({data.fechamentos.length})
        </button>
        <button
          onClick={() => setAbaAtiva('previsao')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            abaAtiva === 'previsao'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          <Clock className="size-4" />
          Previsão Acumulada da Semana
        </button>
      </div>

      {abaAtiva === 'historico' && (
        <Card className="mt-4 relative overflow-hidden">
          {/* Marca d'água oficial CONSTRUTEC com posicionamento inteligente Sticky Viewport */}
          <TableWatermark size="lg" />

          <div className="relative z-1">
            <CardHeader
              title="Fechamentos de Folha Registrados"
              subtitle="Cálculo detalhado com dias apontados, horas extras e débitos por obra"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}>
                  <option value="todos">Todos os Colaboradores</option>
                  {data.funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
                <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="todos">Todos os Tipos</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                  <option value="personalizado">Personalizado</option>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Printer className="size-3.5 text-brand" />}
                  onClick={() => setRecibosParaVisualizar(fechamentosFiltrados.map(gerarDadosRecibo))}
                  disabled={fechamentosFiltrados.length === 0}
                  title="Gerar e imprimir recibos de todos os fechamentos listados"
                >
                  Imprimir Recibos ({fechamentosFiltrados.length})
                </Button>
              </div>
            }
          />

          <div className="overflow-x-auto p-5 pt-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th className="pb-3">Colaborador</th>
                  <th className="pb-3">Tipo & Período</th>
                  <th className="pb-3">Dias Apontados</th>
                  <th className="pb-3">Base & Ajustes</th>
                  <th className="pb-3">Total Líquido</th>
                  <th className="pb-3">Apropriação por Obra</th>
                  <th className="pb-3">Status Pagamento</th>
                  <th className="pb-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fechamentosFiltrados.map((fech) => {
                  const funcionario = data.funcionarios.find((f) => f.id === fech.funcionarioId);
                  const conta = data.contasPagar.find((c) => c.id === fech.contaPagarId);
                  const totalAjustes = fech.ajustes.reduce((s, a) => s + a.valor, 0);

                  return (
                    <tr key={fech.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-fg">{funcionario?.nome || 'Desconhecido'}</div>
                        <div className="text-xs text-muted">
                          {funcionario ? getLabelFuncao(funcionario.funcao) : ''}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          tone={
                            fech.tipo === 'semanal'
                              ? 'blue'
                              : fech.tipo === 'quinzenal'
                              ? 'orange'
                              : fech.tipo === 'personalizado'
                              ? 'neutral'
                              : 'green'
                          }
                        >
                          {fech.tipo === 'semanal'
                            ? 'Semanal'
                            : fech.tipo === 'quinzenal'
                            ? 'Quinzenal'
                            : fech.tipo === 'personalizado'
                            ? 'Personalizado'
                            : 'Mensal'}
                        </Badge>
                        <div className="mt-1 text-xs tabular-nums text-muted">
                          {fmtDateShort(fech.inicio)} a {fmtDateShort(fech.fim)}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold tabular-nums text-fg">{fech.diasTrabalhados}</span>
                        <span className="text-xs text-muted"> dias</span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <div>Base: <span className="font-medium text-fg">{fmtBRL(fech.valorBase)}</span></div>
                        {totalAjustes !== 0 && (
                          <div className={totalAjustes > 0 ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                            {totalAjustes > 0 ? `+${fmtBRL(totalAjustes)}` : fmtBRL(totalAjustes)} em ajustes
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-base font-bold tabular-nums text-fg">{fmtBRL(fech.total)}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col gap-1 max-w-xs">
                          {fech.distribuicao.map((d, i) => {
                            const obra = data.obras.find((o) => o.id === d.centroId);
                            const nomeObra = obra ? obra.nome : 'Sede / Matriz';
                            const cor = obra ? obra.cor : '#64748B';
                            return (
                              <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 truncate">
                                  <span className="size-2 shrink-0 rounded-full" style={{ background: cor }} />
                                  <span className="truncate">{nomeObra}</span>
                                </span>
                                <span className="tabular-nums font-semibold">{fmtBRL(d.valor)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        {conta ? (
                          <div>
                            <Badge tone={conta.status === 'pago' ? 'green' : 'amber'}>
                              {conta.status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                            {conta.status === 'pago' && conta.dataPagamento ? (
                              <div className="mt-1 text-xs text-muted">
                                {fmtDateShort(conta.dataPagamento)}
                                {conta.formaPagamento ? ` · ${LABEL_FORMA_PAGAMENTO[conta.formaPagamento]}` : ''}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-muted">
                                Venc. {fmtDateShort(conta.vencimento)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge tone="neutral">Desvinculado</Badge>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {conta && conta.status === 'pendente' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CheckCircle className="size-3.5" />}
                              onClick={() => abrirModalBaixa(fech)}
                              title="Registrar pagamento desta folha"
                            >
                              Dar Baixa
                            </Button>
                          )}
                          {conta && conta.status === 'pago' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Undo2 className="size-3.5 text-amber-500" />}
                              onClick={() => setFechamentoParaEstornar(fech)}
                              title="Estornar pagamento desta folha para pendente"
                            >
                              Estornar
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Printer className="size-3.5 text-brand" />}
                            onClick={() => setRecibosParaVisualizar([gerarDadosRecibo(fech)])}
                            title="Visualizar e imprimir recibo deste fechamento"
                          >
                            Recibo
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<RotateCcw className="size-3.5" />}
                            onClick={() => setFechamentoParaReabrir(fech)}
                            title={
                              conta?.status === 'pago'
                                ? 'Estorne o pagamento antes de reabrir'
                                : 'Reabrir este fechamento'
                            }
                          >
                            Reabrir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {fechamentosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted">
                      Nenhum fechamento de folha encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    )}

    {abaAtiva === 'previsao' && (
      <Card className="mt-4 relative overflow-hidden">
        {/* Marca d'água oficial CONSTRUTEC com posicionamento inteligente Sticky Viewport */}
        <TableWatermark size="lg" />

        <div className="relative z-1">
          <CardHeader
            title="Previsão Acumulada — Semana Vigente"
            subtitle={`Apuração parcial de Segunda (${fmtDateShort(semanaAtualInicio)}) até Hoje (${fmtDateShort(hoje)})`}
          />
          <div className="overflow-x-auto p-5 pt-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th className="pb-3">Colaborador</th>
                  <th className="pb-3">Função & Regime</th>
                  <th className="pb-3">Dias Apontados na Semana</th>
                  <th className="pb-3">Valor / Diária</th>
                  <th className="pb-3">Total Acumulado</th>
                  <th className="pb-3">Obras com Atuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {previsaoColaboradores.map(({ funcionario: f, diasTrabalhados, valorPrevisto, obras }) => (
                  <tr key={f.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 pr-4 font-semibold text-fg">{f.nome}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="blue">{getLabelFuncao(f.funcao)}</Badge>
                        <span className="text-xs text-muted">{LABEL_REGIME[f.regime] || f.regime}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="font-bold tabular-nums text-fg">{diasTrabalhados}</span>
                      <span className="text-xs text-muted"> dias</span>
                    </td>
                    <td className="py-3.5 pr-4 tabular-nums text-muted">
                      {f.regime !== 'mensalista' ? `${fmtBRL(f.diaria)} /dia` : `${fmtBRL(f.salario)} /mês`}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="font-bold tabular-nums text-emerald-500">{fmtBRL(valorPrevisto)}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {obras.length > 0 ? (
                          obras.map((cId) => {
                            const o = data.obras.find((x) => x.id === cId);
                            return (
                              <Badge key={cId} tone="neutral">
                                {o ? o.nome : 'Sede'}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted">Sem apontamento</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    )}

      {/* Diálogo de Novo Fechamento Individual */}
      <FechamentoFolhaDialog open={dialogNovoOpen} onClose={() => setDialogNovoOpen(false)} />

      {/* Diálogo de Fechamento em Lote / Bloco */}
      <FechamentoFolhaLoteDialog open={dialogLoteOpen} onClose={() => setDialogLoteOpen(false)} />

      {/* Modal Dar Baixa de Pagamento */}
      <Dialog
        open={!!fechamentoParaBaixa}
        onClose={() => setFechamentoParaBaixa(null)}
        title="Confirmar Pagamento da Folha"
        subtitle={
          fechamentoParaBaixa
            ? `${data.funcionarios.find((f) => f.id === fechamentoParaBaixa.funcionarioId)?.nome || 'Colaborador'} · ${fmtBRL(fechamentoParaBaixa.total)}`
            : undefined
        }
      >
        {fechamentoParaBaixa && (
          <form onSubmit={executarBaixa} className="space-y-4">
            <div className="rounded-lg border border-line bg-surface-2/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Período apurado</span>
                <span className="font-medium text-fg">
                  {fmtDate(fechamentoParaBaixa.inicio)} a {fmtDate(fechamentoParaBaixa.fim)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted">Valor líquido a liquidar</span>
                <span className="font-bold text-emerald-500">{fmtBRL(fechamentoParaBaixa.total)}</span>
              </div>
            </div>

            <Field label="Data do Pagamento">
              <Input
                type="date"
                required
                value={baixaData}
                onChange={(e) => setBaixaData(e.target.value)}
              />
            </Field>

            <Field label="Forma de Pagamento">
              <Select
                value={baixaForma}
                onChange={(e) => setBaixaForma(e.target.value as FormaPagamento)}
              >
                {(Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((fp) => (
                  <option key={fp} value={fp}>
                    {LABEL_FORMA_PAGAMENTO[fp]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setFechamentoParaBaixa(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={<CheckCircle className="size-4" />}>
                Confirmar Baixa
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Modal Estornar Pagamento */}
      <Dialog
        open={!!fechamentoParaEstornar}
        onClose={() => setFechamentoParaEstornar(null)}
        title="Estornar Pagamento?"
        subtitle={
          fechamentoParaEstornar
            ? `${data.funcionarios.find((f) => f.id === fechamentoParaEstornar.funcionarioId)?.nome || 'Colaborador'} · ${fmtBRL(fechamentoParaEstornar.total)}`
            : undefined
        }
      >
        {fechamentoParaEstornar && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-fg">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <p className="text-muted">
                O status do pagamento voltará para <strong className="text-fg">Pendente</strong>, removendo a data e a
                forma de quitação registradas. Caso deseje alterar dias ou valores, depois você poderá reabrir o fechamento.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFechamentoParaEstornar(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={() => executarEstorno(fechamentoParaEstornar)}>
                Confirmar Estorno
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmação de Reabertura */}
      <Dialog
        open={!!fechamentoParaReabrir}
        onClose={() => setFechamentoParaReabrir(null)}
        title="Reabrir Fechamento?"
      >
        {fechamentoParaReabrir && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm text-muted">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <p>
                Ao reabrir este fechamento de folha, a conta a pagar associada será removida (se ainda estiver pendente)
                e você poderá realizar um novo fechamento para este colaborador.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFechamentoParaReabrir(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={() => executarReabertura(fechamentoParaReabrir)}>
                Confirmar Reabertura
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Modal de Recibos Profissionais de Pagamento */}
      {recibosParaVisualizar && (
        <RecibosFolhaDialog
          open={!!recibosParaVisualizar}
          onClose={() => setRecibosParaVisualizar(null)}
          recibos={recibosParaVisualizar}
          titulo="Recibo de Pagamento de Folha"
        />
      )}

      {/* Modal de Recibo Consolidado do Empreiteiro */}
      <ReciboEmpreiteiroDialog
        open={dialogEmpreiteiroOpen}
        onClose={() => setDialogEmpreiteiroOpen(false)}
      />
    </>
  );
}
