import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Edit,
  Phone,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, Button, Progress } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import type { ServicoEmpreitada } from '@/domain/types';
import { LABEL_STATUS_SERVICO } from '@/domain/labels';
import { fmtBRL, fmtDate, fmtPct } from '@/lib/format';

interface DetalhesServicoDialogProps {
  servico: ServicoEmpreitada | null;
  onClose: () => void;
  onEditar: (servico: ServicoEmpreitada) => void;
}

export function DetalhesServicoDialog({
  servico,
  onClose,
  onEditar,
}: DetalhesServicoDialogProps) {
  const data = useData();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  if (!servico) return null;

  const servicoAtual = (data.servicos || []).find((s) => s.id === servico.id) ?? servico;
  const obra = data.obras.find((o) => o.id === servicoAtual.obraId);

  // Status financeiro das etapas
  let totalPago = 0;
  let totalPendente = 0;

  servicoAtual.etapas.forEach((etp) => {
    const conta = data.contasPagar.find((c) => c.id === etp.contaPagarId);
    const pago = conta ? conta.status === 'pago' : etp.status === 'pago';
    if (pago) {
      totalPago += etp.valor;
    } else {
      totalPendente += etp.valor;
    }
  });

  const progressoFinanceiroPct = servicoAtual.valorTotal > 0 ? totalPago / servicoAtual.valorTotal : 0;

  const alterarStatusServico = (novoStatus: ServicoEmpreitada['status']) => {
    if (!isAdmin) return;
    mutate(
      (d) => {
        const s = d.servicos.find((x) => x.id === servicoAtual.id);
        if (s) {
          s.status = novoStatus;
          if (novoStatus === 'concluido') {
            s.dataConclusao = new Date().toISOString().slice(0, 10);
          }
        }
      },
      {
        acao: 'Status de Empreitada',
        descricao: `Alterou status do serviço "${servicoAtual.descricao}" para ${LABEL_STATUS_SERVICO[novoStatus]}`,
      },
    );
    toast(`Status do serviço alterado para: ${LABEL_STATUS_SERVICO[novoStatus]}`);
  };

  const liquidarParcelaRapida = (etapaId: string, contaId?: string) => {
    if (!isAdmin) return;
    mutate(
      (d) => {
        const s = d.servicos.find((x) => x.id === servicoAtual.id);
        const etp = s?.etapas.find((e) => e.id === etapaId);
        if (etp) {
          etp.status = 'pago';
        }
        const alvoContaId = contaId || etp?.contaPagarId;
        if (alvoContaId) {
          const c = d.contasPagar.find((x) => x.id === alvoContaId);
          if (c) {
            c.status = 'pago';
            c.dataPagamento = new Date().toISOString().slice(0, 10);
            c.formaPagamento = 'pix';
          }
        }
      },
      {
        acao: 'Baixa de Parcela',
        descricao: `Baixou pagamento de parcela da empreitada "${servicoAtual.descricao}" via Pix`,
      },
    );
    toast('Parcela baixada como Paga via Pix!');
  };

  const estornarParcela = (etapaId: string, contaId?: string) => {
    if (!isAdmin) return;
    mutate(
      (d) => {
        const s = d.servicos.find((x) => x.id === servicoAtual.id);
        const etp = s?.etapas.find((e) => e.id === etapaId);
        if (etp) {
          etp.status = 'pendente';
        }
        const alvoContaId = contaId || etp?.contaPagarId;
        if (alvoContaId) {
          const c = d.contasPagar.find((x) => x.id === alvoContaId);
          if (c) {
            c.status = 'pendente';
            c.dataPagamento = undefined;
            c.formaPagamento = undefined;
          }
        }
      },
      {
        acao: 'Estorno de Parcela',
        descricao: `Estornou pagamento de parcela da empreitada "${servicoAtual.descricao}"`,
      },
    );
    toast('Pagamento estornado para pendente.');
  };

  const cancelarContrato = () => {
    if (!isAdmin) return;
    mutate(
      (d) => {
        const s = d.servicos.find((x) => x.id === servicoAtual.id);
        if (s) s.status = 'cancelado';

        // Cancelar contas a pagar pendentes
        servicoAtual.etapas.forEach((e) => {
          if (e.contaPagarId) {
            const c = d.contasPagar.find((x) => x.id === e.contaPagarId);
            if (c && c.status === 'pendente') {
              c.status = 'cancelado';
            }
          }
        });
      },
      {
        acao: 'Cancelamento de Contrato',
        descricao: `Cancelou contrato de serviço "${servicoAtual.descricao}" com ${servicoAtual.prestadorNome}`,
      },
    );
    toast('Contrato cancelado e contas pendentes estornadas.');
    onClose();
  };

  return (
    <Dialog
      open={!!servico}
      onClose={onClose}
      title={servicoAtual.descricao}
      subtitle={`Prestador: ${servicoAtual.prestadorNome} (${servicoAtual.funcao}) • Obra: ${obra?.nome || 'Não definida'}`}
      wide
    >
      <div className="space-y-6">
        {/* Painel Superior de Indicadores */}
        <div className={isAdmin ? 'grid gap-3 sm:grid-cols-4' : 'grid gap-3 sm:grid-cols-1'}>
          <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
            <span className="text-xs text-muted">Status do Contrato</span>
            <div className="mt-1">
              <Badge
                tone={
                  servicoAtual.status === 'concluido'
                    ? 'green'
                    : servicoAtual.status === 'andamento'
                    ? 'orange'
                    : 'neutral'
                }
              >
                {LABEL_STATUS_SERVICO[servicoAtual.status]}
              </Badge>
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                <span className="text-xs text-muted">Valor Total Fechado</span>
                <div className="mt-1 text-base font-bold tabular-nums text-fg">{fmtBRL(servicoAtual.valorTotal)}</div>
              </div>

              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                <span className="text-xs text-muted">Total Já Pago</span>
                <div className="mt-1 text-base font-bold tabular-nums text-emerald-500">{fmtBRL(totalPago)}</div>
              </div>

              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                <span className="text-xs text-muted">Saldo a Quitar</span>
                <div className="mt-1 text-base font-bold tabular-nums text-amber-500">{fmtBRL(totalPendente)}</div>
              </div>
            </>
          )}
        </div>

        {/* Progresso de Pagamento */}
        {isAdmin && (
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>Progresso de Pagamento da Empreitada</span>
              <span className="font-bold text-fg tabular-nums">{fmtPct(progressoFinanceiroPct)}</span>
            </div>
            <Progress value={progressoFinanceiroPct} />
          </div>
        )}

        {/* Informações de Contato e Prazos */}
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Dados do Prestador</h4>
            <div className="font-semibold text-fg">{servicoAtual.prestadorNome}</div>
            <div className="text-xs text-muted">Especialidade: {servicoAtual.funcao}</div>
            {servicoAtual.prestadorContato && (
              <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
                <Phone className="size-3.5 text-brand" />
                <span>{servicoAtual.prestadorContato}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Cronograma de Execução</h4>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="size-4 text-muted" />
              <span>
                Início: <strong>{fmtDate(servicoAtual.dataInicio)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="size-4 text-muted" />
              <span>
                Previsão de Entrega: <strong>{fmtDate(servicoAtual.previsaoEntrega)}</strong>
              </span>
            </div>
            {servicoAtual.dataConclusao && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
                <CheckCircle className="size-4" />
                <span>Entregue em: {fmtDate(servicoAtual.dataConclusao)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Etapas / Parcelas de Pagamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-fg">
              Etapas &amp; Parcelas Contratadas ({servicoAtual.etapas.length})
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-2.5 px-3">Etapa / Descrição</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Status</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Valor</th>}
                  {isAdmin && <th className="py-2.5 px-3 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {servicoAtual.etapas.map((etp) => {
                  const conta = data.contasPagar.find((c) => c.id === etp.contaPagarId);
                  const estaPago = conta ? conta.status === 'pago' : etp.status === 'pago';

                  return (
                    <tr key={etp.id} className="hover:bg-surface-2/40">
                      <td className="py-3 px-3 font-semibold text-fg">{etp.descricao}</td>
                      <td className="py-3 px-3 tabular-nums text-muted">{fmtDate(etp.vencimento)}</td>
                      <td className="py-3 px-3">
                        <Badge tone={estaPago ? 'green' : 'amber'}>{estaPago ? 'Pago' : 'Pendente'}</Badge>
                      </td>
                      {isAdmin && <td className="py-3 px-3 text-right font-bold tabular-nums text-fg">{fmtBRL(etp.valor)}</td>}
                      {isAdmin && (
                        <td className="py-3 px-3 text-right">
                          {!estaPago ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => liquidarParcelaRapida(etp.id, etp.contaPagarId)}
                            >
                              Dar Baixa (Pix)
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1">
                                <CheckCircle className="size-3" /> Liquidado
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<RotateCcw className="size-3" />}
                                onClick={() => estornarParcela(etp.id, etp.contaPagarId)}
                                title="Estornar pagamento desta parcela"
                              >
                                Estornar
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé de Ações de Gestão */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex items-center gap-2">
              {servicoAtual.status === 'andamento' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle className="size-4" />}
                  onClick={() => alterarStatusServico('concluido')}
                >
                  Concluir Serviço
                </Button>
              )}
              {servicoAtual.status === 'concluido' && (
                <Button variant="secondary" size="sm" onClick={() => alterarStatusServico('andamento')}>
                  Reabrir para Andamento
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit className="size-4" />}
                onClick={() => {
                  onClose();
                  onEditar(servicoAtual);
                }}
              >
                Editar Contrato
              </Button>
            </div>

            <div>
              {!confirmandoCancelamento ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setConfirmandoCancelamento(true)}
                >
                  Cancelar Contrato
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-semibold">Confirmar cancelamento?</span>
                  <Button variant="danger" size="sm" onClick={cancelarContrato}>
                    Sim, Cancelar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmandoCancelamento(false)}>
                    Não
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
