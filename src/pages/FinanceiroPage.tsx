import { useState } from 'react';
import { Plus, Landmark, CheckCircle2, AlertTriangle, RotateCcw, Ban, Download, Printer, RefreshCw } from 'lucide-react';
import { Button, PageHeader, Card, Badge } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useHoje, useIsAdmin } from '@/hooks';
import { SEDE, type CentroId, type ContaPagar, type ContaReceber } from '@/domain/types';
import { LABEL_CATEGORIA_GASTO, LABEL_FORMA_PAGAMENTO } from '@/domain/labels';
import { fmtBRL, fmtDate } from '@/lib/format';
import { contaVencida } from '@/domain/engine';
import { BaixarContaPagarDialog } from '@/features/financeiro/BaixarContaPagarDialog';
import { ContaPagarFormDialog } from '@/features/financeiro/ContaPagarFormDialog';
import { MedicaoReceberFormDialog } from '@/features/financeiro/MedicaoReceberFormDialog';
import { BaixarRecebimentoDialog } from '@/features/financeiro/BaixarRecebimentoDialog';
import { RecorrenciaFormDialog } from '@/features/financeiro/RecorrenciaFormDialog';

export function FinanceiroPage() {
  const data = useData();
  const hoje = useHoje();
  const mutate = useErp((s) => s.mutate);
  const isAdmin = useIsAdmin();

  const [abaAtiva, setAbaAtiva] = useState<'pagar' | 'receber' | 'recorrencias'>('pagar');
  const [filtroStatusPagar, setFiltroStatusPagar] = useState<'todos' | 'pendente' | 'vencido' | 'pago'>('pendente');
  const [filtroStatusReceber, setFiltroStatusReceber] = useState<'todos' | 'pendente' | 'recebido' | 'vencido'>('todos');

  // Modais
  const [modalBaixarPagar, setModalBaixarPagar] = useState<ContaPagar | null>(null);
  const [modalNovoPagar, setModalNovoPagar] = useState(false);
  const [modalNovaMedicao, setModalNovaMedicao] = useState(false);
  const [modalBaixarReceber, setModalBaixarReceber] = useState<ContaReceber | null>(null);
  const [modalNovaRecorrencia, setModalNovaRecorrencia] = useState(false);

  // Cálculos de métricas
  const totalPagarPendente = data.contasPagar
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + c.valor, 0);

  const totalPagarVencido = data.contasPagar
    .filter((c) => contaVencida(c, hoje))
    .reduce((s, c) => s + c.valor, 0);

  const totalReceberPendente = data.contasReceber
    .filter((c) => c.status === 'pendente')
    .reduce((s, c) => s + c.valor, 0);

  const getNomeCentro = (cid: CentroId) => {
    if (cid === SEDE) return 'Sede / Matriz';
    return data.obras.find((o) => o.id === cid)?.nome || cid;
  };

  const estornarPagamento = (c: ContaPagar) => {
    if (!window.confirm(`Deseja estornar o pagamento da conta "${c.descricao}"? Ela retornará para o status Pendente e o valor voltará ao caixa.`)) {
      return;
    }

    mutate(
      (d) => {
        const item = d.contasPagar.find((x) => x.id === c.id);
        if (item) {
          item.status = 'pendente';
          item.dataPagamento = undefined;
          item.formaPagamento = undefined;
        }
      },
      {
        acao: 'Contas a Pagar',
        descricao: `Estornou pagamento de "${c.descricao}" (${fmtBRL(c.valor)})`,
      },
    );

    toast(`Pagamento estornado com sucesso.`);
  };

  const cancelarConta = (c: ContaPagar) => {
    if (c.status === 'pago') {
      toast('Não é possível cancelar uma conta já paga. Estorne o pagamento primeiro.', 'error');
      return;
    }

    if (!window.confirm(`Deseja cancelar a conta "${c.descricao}"?`)) return;

    mutate(
      (d) => {
        const item = d.contasPagar.find((x) => x.id === c.id);
        if (item) item.status = 'cancelado';
      },
      {
        acao: 'Contas a Pagar',
        descricao: `Cancelou conta a pagar "${c.descricao}"`,
      },
    );

    toast('Conta a pagar cancelada.');
  };

  const alternarRecorrencia = (id: string, ativo: boolean) => {
    mutate(
      (d) => {
        const item = d.recorrencias.find((r) => r.id === id);
        if (item) item.ativo = !ativo;
      },
      {
        acao: 'Recorrências',
        descricao: `${!ativo ? 'Ativou' : 'Pausou'} recorrência mensal`,
      },
    );
  };

  const contasPagarFiltradas = data.contasPagar
    .filter((c) => {
      if (filtroStatusPagar === 'pendente') return c.status === 'pendente' && !contaVencida(c, hoje);
      if (filtroStatusPagar === 'vencido') return contaVencida(c, hoje);
      if (filtroStatusPagar === 'pago') return c.status === 'pago';
      return c.status !== 'cancelado';
    })
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1));

  const contasReceberFiltradas = data.contasReceber
    .filter((c) => {
      if (filtroStatusReceber === 'pendente') return c.status === 'pendente' && c.vencimento >= hoje;
      if (filtroStatusReceber === 'vencido') return c.status === 'pendente' && c.vencimento < hoje;
      if (filtroStatusReceber === 'recebido') return c.status === 'recebido';
      return c.status !== 'cancelado';
    })
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1));

  const exportarCSV = () => {
    let csv = 'Descricao;Tipo;Categoria;Centro;Valor (R$);Vencimento;Status;Data Pagamento/Recebimento\n';
    data.contasPagar.forEach((c) => {
      const centro = c.distribuicao.map((d) => getNomeCentro(d.centroId)).join(', ');
      csv += `${c.descricao};Pagar;${LABEL_CATEGORIA_GASTO[c.categoria]};${centro};${c.valor.toFixed(2).replace('.', ',')};${c.vencimento};${c.status};${c.dataPagamento || ''}\n`;
    });
    data.contasReceber.forEach((r) => {
      const obra = data.obras.find((o) => o.id === r.obraId)?.nome || 'Obra';
      csv += `${r.descricao};Receber;Receita Contrato;${obra};${r.valor.toFixed(2).replace('.', ',')};${r.vencimento};${r.status};${r.dataRecebimento || ''}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financeiro_construtec_${hoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageHeader
        title="Contas a Pagar & Receber (Financeiro)"
        subtitle="Controle de compromissos a fornecedores, salários, medições de clientes e custos fixos"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportarCSV}>
              Exportar CSV
            </Button>
            <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Imprimir
            </Button>
            {isAdmin && abaAtiva === 'pagar' && (
              <Button icon={<Plus className="size-4" />} onClick={() => setModalNovoPagar(true)}>
                Nova Conta a Pagar
              </Button>
            )}
            {isAdmin && abaAtiva === 'receber' && (
              <Button icon={<Plus className="size-4" />} onClick={() => setModalNovaMedicao(true)}>
                Nova Medição a Receber
              </Button>
            )}
            {isAdmin && abaAtiva === 'recorrencias' && (
              <Button icon={<Plus className="size-4" />} onClick={() => setModalNovaRecorrencia(true)}>
                Novo Custo Fixo
              </Button>
            )}
          </div>
        }
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 mb-6 no-print">
        <StatCard
          label="A Pagar Pendente"
          value={fmtBRL(totalPagarPendente)}
          hint={
            totalPagarVencido > 0 ? (
              <span className="text-red-500 font-bold">{fmtBRL(totalPagarVencido)} vencidas</span>
            ) : (
              'Compromissos em dia'
            )
          }
          icon={<Landmark className="size-4 sm:size-5" />}
          tone={totalPagarVencido > 0 ? 'red' : 'amber'}
        />
        <StatCard
          label="A Receber"
          value={fmtBRL(totalReceberPendente)}
          hint="Medições previstas"
          icon={<CheckCircle2 className="size-4 sm:size-5" />}
          tone="green"
        />
        <StatCard
          label="Custos Fixos Sede"
          value={fmtBRL(data.recorrencias.filter((r) => r.ativo).reduce((s, r) => s + r.valor, 0))}
          hint="Mensal recorrente"
          icon={<RefreshCw className="size-4 sm:size-5" />}
          tone="blue"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 mb-6 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAbaAtiva('pagar')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'pagar' ? 'bg-brand text-white shadow-sm' : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <Landmark className="size-4" />
            Contas a Pagar
          </button>
          <button
            onClick={() => setAbaAtiva('receber')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'receber' ? 'bg-brand text-white shadow-sm' : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <CheckCircle2 className="size-4" />
            Contas a Receber (Clientes)
          </button>
          <button
            onClick={() => setAbaAtiva('recorrencias')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === 'recorrencias' ? 'bg-brand text-white shadow-sm' : 'bg-surface-2 text-muted hover:text-fg'
            }`}
          >
            <RefreshCw className="size-4" />
            Custos Fixos / Recorrências
          </button>
        </div>

        {/* Filtros da aba atual */}
        {abaAtiva === 'pagar' && (
          <div className="flex items-center gap-1 text-xs">
            {(['pendente', 'vencido', 'pago', 'todos'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatusPagar(st)}
                className={`rounded-lg px-2.5 py-1 font-semibold capitalize ${
                  filtroStatusPagar === st ? 'bg-surface text-brand border border-brand' : 'text-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {abaAtiva === 'receber' && (
          <div className="flex items-center gap-1 text-xs">
            {(['todos', 'pendente', 'vencido', 'recebido'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatusReceber(st)}
                className={`rounded-lg px-2.5 py-1 font-semibold capitalize ${
                  filtroStatusReceber === st ? 'bg-surface text-brand border border-brand' : 'text-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ABA 1: CONTAS A PAGAR */}
      {abaAtiva === 'pagar' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Descrição / Origem</th>
                  <th className="px-4 py-3">Beneficiário / Fornecedor</th>
                  <th className="px-4 py-3">Centro de Custo</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contasPagarFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted text-xs">
                      Nenhuma conta a pagar encontrada neste filtro.
                    </td>
                  </tr>
                ) : (
                  contasPagarFiltradas.map((cp) => {
                    const forn = data.fornecedores.find((f) => f.id === cp.fornecedorId);
                    const func = data.funcionarios.find((f) => f.id === cp.funcionarioId);
                    const beneficiario = forn?.nome || func?.nome || '—';
                    const vencida = contaVencida(cp, hoje);

                    return (
                      <tr key={cp.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-fg">{cp.descricao}</div>
                          <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{LABEL_CATEGORIA_GASTO[cp.categoria]}</span>
                            {cp.documento && <span>• Doc: {cp.documento}</span>}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-fg font-medium">
                          {beneficiario}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted">
                          {cp.distribuicao.length === 1 ? (
                            getNomeCentro(cp.distribuicao[0].centroId)
                          ) : (
                            <span title={cp.distribuicao.map((d) => `${getNomeCentro(d.centroId)}: ${fmtBRL(d.valor)}`).join(' | ')}>
                              Rateio ({cp.distribuicao.length} centros)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-xs tabular-nums">
                          <div className={vencida ? 'text-red-500 font-bold flex items-center gap-1' : 'text-fg font-medium'}>
                            {vencida && <AlertTriangle className="size-3" />}
                            {fmtDate(cp.vencimento)}
                          </div>
                          {cp.dataPagamento && (
                            <div className="text-[10px] text-emerald-500 font-medium">
                              Pago em {fmtDate(cp.dataPagamento)} ({LABEL_FORMA_PAGAMENTO[cp.formaPagamento || 'pix']})
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                          {fmtBRL(cp.valor)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            tone={
                              cp.status === 'pago'
                                ? 'green'
                                : vencida
                                ? 'red'
                                : cp.status === 'cancelado'
                                ? 'neutral'
                                : 'amber'
                            }
                          >
                            {cp.status === 'pago' ? 'Pago' : vencida ? 'Vencido' : 'Pendente'}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            {cp.status === 'pendente' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
                                onClick={() => setModalBaixarPagar(cp)}
                              >
                                Baixar
                              </Button>
                            )}

                            {cp.status === 'pago' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<RotateCcw className="size-3.5 text-amber-500" />}
                                onClick={() => estornarPagamento(cp)}
                                title="Estornar pagamento (reverter para Pendente)"
                              >
                                Estornar
                              </Button>
                            )}

                            {cp.status === 'pendente' && isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Ban className="size-3.5 text-red-500" />}
                                onClick={() => cancelarConta(cp)}
                                title="Cancelar conta a pagar"
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 2: CONTAS A RECEBER */}
      {abaAtiva === 'receber' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Obra / Contratante</th>
                  <th className="px-4 py-3">Descrição da Medição</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor da Parcela</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contasReceberFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted text-xs">
                      Nenhuma medição encontrada neste filtro.
                    </td>
                  </tr>
                ) : (
                  contasReceberFiltradas.map((cr) => {
                    const obra = data.obras.find((o) => o.id === cr.obraId);
                    const atrasada = cr.status === 'pendente' && cr.vencimento < hoje;

                    return (
                      <tr key={cr.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-fg">{obra?.nome || '—'}</div>
                          <div className="text-[11px] text-muted">Cliente: {obra?.cliente || '—'}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-medium text-fg">{cr.descricao}</div>
                          {cr.documento && <div className="text-[11px] text-muted">{cr.documento}</div>}
                        </td>

                        <td className="px-4 py-3.5 text-xs tabular-nums">
                          <div className={atrasada ? 'text-red-500 font-bold flex items-center gap-1' : 'text-fg font-medium'}>
                            {atrasada && <AlertTriangle className="size-3" />}
                            {fmtDate(cr.vencimento)}
                          </div>
                          {cr.dataRecebimento && (
                            <div className="text-[10px] text-emerald-500 font-medium">
                              Recebido em {fmtDate(cr.dataRecebimento)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                          {fmtBRL(cr.valor)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            tone={
                              cr.status === 'recebido'
                                ? 'green'
                                : atrasada
                                ? 'red'
                                : 'blue'
                            }
                          >
                            {cr.status === 'recebido' ? 'Recebido' : atrasada ? 'Atrasado' : 'A receber'}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5 text-center no-print">
                          {cr.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
                              onClick={() => setModalBaixarReceber(cr)}
                            >
                              Confirmar Recebimento
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 3: RECORRÊNCIAS / CUSTOS FIXOS */}
      {abaAtiva === 'recorrencias' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-line bg-surface-2/40 text-xs text-muted flex items-center gap-2">
            <RefreshCw className="size-4 text-brand" />
            <span>O sistema gera as contas a pagar mensais destes itens automaticamente no início de cada mês.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Descrição do Custo Fixo</th>
                  <th className="px-4 py-3">Dia de Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor Mensal</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recorrencias.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-fg">
                      {rec.descricao}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      Todo dia {rec.diaVencimento} do mês
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-fg">
                      {fmtBRL(rec.valor)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge tone={rec.ativo ? 'green' : 'neutral'}>
                        {rec.ativo ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center no-print">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => alternarRecorrencia(rec.id, rec.ativo)}
                      >
                        {rec.ativo ? 'Pausar' : 'Reativar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modais */}
      <BaixarContaPagarDialog
        conta={modalBaixarPagar}
        onClose={() => setModalBaixarPagar(null)}
      />
      <ContaPagarFormDialog
        open={modalNovoPagar}
        onClose={() => setModalNovoPagar(false)}
      />
      <MedicaoReceberFormDialog
        open={modalNovaMedicao}
        onClose={() => setModalNovaMedicao(false)}
      />
      <BaixarRecebimentoDialog
        conta={modalBaixarReceber}
        onClose={() => setModalBaixarReceber(null)}
      />
      <RecorrenciaFormDialog
        open={modalNovaRecorrencia}
        onClose={() => setModalNovaRecorrencia(false)}
      />
    </>
  );
}
