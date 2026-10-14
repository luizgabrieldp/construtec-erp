import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Phone,
  Trash2,
  Wrench,
  Calendar,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, Button, Progress } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
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
  const mutate = useErp((s) => s.mutate);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  if (!servico) return null;

  const obra = data.obras.find((o) => o.id === servico.obraId);

  // Status financeiro das etapas
  let totalPago = 0;
  let totalPendente = 0;

  servico.etapas.forEach((etp) => {
    const conta = data.contasPagar.find((c) => c.id === etp.contaPagarId);
    if (conta?.status === 'pago') {
      totalPago += etp.valor;
    } else {
      totalPendente += etp.valor;
    }
  });

  const progressoFinanceiroPct = servico.valorTotal > 0 ? totalPago / servico.valorTotal : 0;

  const alterarStatusServico = (novoStatus: ServicoEmpreitada['status']) => {
    mutate((d) => {
      const s = d.servicos.find((x) => x.id === servico.id);
      if (s) {
        s.status = novoStatus;
        if (novoStatus === 'concluido') {
          s.dataConclusao = new Date().toISOString().slice(0, 10);
        }
      }
    }, {
      acao: 'Status de Empreitada',
      descricao: `Alterou status do serviço "${servico.descricao}" para ${LABEL_STATUS_SERVICO[novoStatus]}`,
    });
    toast(`Status do serviço alterado para: ${LABEL_STATUS_SERVICO[novoStatus]}`);
  };

  const liquidarParcelaRapida = (contaId?: string) => {
    if (!contaId) return;
    mutate((d) => {
      const c = d.contasPagar.find((x) => x.id === contaId);
      if (c) {
        c.status = 'pago';
        c.dataPagamento = new Date().toISOString().slice(0, 10);
        c.formaPagamento = 'pix';
      }
    }, {
      acao: 'Baixa de Parcela',
      descricao: `Baixou pagamento de parcela da empreitada "${servico.descricao}" no valor do título`,
    });
    toast('Parcela baixada como Paga via Pix!');
  };

  const cancelarContrato = () => {
    mutate((d) => {
      const s = d.servicos.find((x) => x.id === servico.id);
      if (s) s.status = 'cancelado';

      // Cancelar contas a pagar pendentes
      servico.etapas.forEach((e) => {
        if (e.contaPagarId) {
          const c = d.contasPagar.find((x) => x.id === e.contaPagarId);
          if (c && c.status === 'pendente') {
            c.status = 'cancelado';
          }
        }
      });
    }, {
      acao: 'Cancelamento de Contrato',
      descricao: `Cancelou contrato de serviço "${servico.descricao}" com ${servico.prestadorNome}`,
    });
    toast('Contrato cancelado e contas pendentes estornadas.');
    onClose();
  };

  return (
    <Dialog
      open={!!servico}
      onClose={onClose}
      title={servico.descricao}
      subtitle={`Prestador: ${servico.prestadorNome} (${servico.funcao}) • Obra: ${obra?.nome || 'Não definida'}`}
      wide
    >
      <div className="space-y-6">
        {/* Painel Superior de Indicadores */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
            <span className="text-xs text-muted">Status do Contrato</span>
            <div className="mt-1">
              <Badge tone={servico.status === 'concluido' ? 'green' : servico.status === 'andamento' ? 'orange' : 'neutral'}>
                {LABEL_STATUS_SERVICO[servico.status]}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
            <span className="text-xs text-muted">Valor Total Fechado</span>
            <div className="mt-1 text-base font-bold tabular-nums text-fg">{fmtBRL(servico.valorTotal)}</div>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
            <span className="text-xs text-muted">Total Já Pago</span>
            <div className="mt-1 text-base font-bold tabular-nums text-emerald-500">{fmtBRL(totalPago)}</div>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
            <span className="text-xs text-muted">Saldo a Quitar</span>
            <div className="mt-1 text-base font-bold tabular-nums text-amber-500">{fmtBRL(totalPendente)}</div>
          </div>
        </div>

        {/* Progresso de Pagamento */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>Progresso de Pagamento da Empreitada</span>
            <span className="font-bold text-fg">{fmtPct(progressoFinanceiroPct)}</span>
          </div>
          <Progress value={progressoFinanceiroPct} />
        </div>

        {/* Informações de Contato e Prazos */}
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Dados do Prestador</h4>
            <div className="font-semibold text-fg">{servico.prestadorNome}</div>
            <div className="text-xs text-muted">Especialidade: {servico.funcao}</div>
            {servico.prestadorContato && (
              <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
                <Phone className="size-3.5 text-brand" />
                <span>{servico.prestadorContato}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Cronograma de Execução</h4>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="size-4 text-muted" />
              <span>Início: <strong>{fmtDate(servico.dataInicio)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="size-4 text-muted" />
              <span>Previsão de Entrega: <strong>{fmtDate(servico.previsaoEntrega)}</strong></span>
            </div>
            {servico.dataConclusao && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
                <CheckCircle className="size-4" />
                <span>Entregue em: {fmtDate(servico.dataConclusao)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Etapas / Parcelas de Pagamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-fg">Etapas & Parcelas Contratadas ({servico.etapas.length})</h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-2.5 px-3">Etapa / Descrição</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {servico.etapas.map((etp) => {
                  const conta = data.contasPagar.find((c) => c.id === etp.contaPagarId);
                  const estaPago = conta?.status === 'pago';

                  return (
                    <tr key={etp.id} className="hover:bg-surface-2/40">
                      <td className="py-3 px-3 font-semibold text-fg">{etp.descricao}</td>
                      <td className="py-3 px-3 tabular-nums text-muted">{fmtDate(etp.vencimento)}</td>
                      <td className="py-3 px-3">
                        <Badge tone={estaPago ? 'green' : 'amber'}>
                          {estaPago ? 'Pago' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-fg">
                        {fmtBRL(etp.valor)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!estaPago && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => liquidarParcelaRapida(etp.contaPagarId)}
                          >
                            Dar Baixa (Pix)
                          </Button>
                        )}
                        {estaPago && (
                          <span className="text-emerald-500 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle className="size-3" /> Liquidado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé de Ações de Gestão */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-2">
            {servico.status === 'andamento' && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle className="size-4" />}
                onClick={() => alterarStatusServico('concluido')}
              >
                Concluir Serviço
              </Button>
            )}
            {servico.status === 'concluido' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => alterarStatusServico('andamento')}
              >
                Reabrir para Andamento
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit className="size-4" />}
              onClick={() => {
                onClose();
                onEditar(servico);
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
      </div>
    </Dialog>
  );
}
