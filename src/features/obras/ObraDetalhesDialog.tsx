import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, Card, Progress, Button } from '@/components/ui';
import { useData } from '@/data/store';
import { useResumo, useIsAdmin } from '@/hooks';
import type { Obra, ServicoEmpreitada } from '@/domain/types';
import { LABEL_OBRA_STATUS, LABEL_UNIDADE, LABEL_STATUS_SERVICO } from '@/domain/labels';
import { fmtBRL, fmtDate, fmtPct } from '@/lib/format';
import { diffDays } from '@/lib/dates';
import { HardHat, Construction, Package, Calendar, Briefcase, Plus, Trash2 } from 'lucide-react';
import { processarEstoque } from '@/domain/selectors';
import { ServicoFormDialog } from '@/features/servicos/ServicoFormDialog';
import { DetalhesServicoDialog } from '@/features/servicos/DetalhesServicoDialog';
import { FaseObraStepper } from './FaseObraStepper';
import { ConfirmarExclusaoObraDialog } from './ConfirmarExclusaoObraDialog';

interface ObraDetalhesDialogProps {
  obra: Obra | null;
  onClose: () => void;
}

export function ObraDetalhesDialog({ obra, onClose }: ObraDetalhesDialogProps) {
  const data = useData();
  const r = useResumo();
  const isAdmin = useIsAdmin();
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [servicoFormAberto, setServicoFormAberto] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState<ServicoEmpreitada | null>(null);
  const [servicoParaEditar, setServicoParaEditar] = useState<ServicoEmpreitada | null>(null);

  if (!obra) return null;

  const ro = r.porObra[obra.id];
  const { estoque } = processarEstoque(data, r.hoje);
  const estoqueObra = estoque[obra.id] || {};

  // Materiais alocados nesta obra com saldo em estoque
  const materiaisComSaldo = data.materiais
    .map((m) => {
      const s = estoqueObra[m.id];
      return {
        material: m,
        quantidade: s?.quantidade || 0,
        valor: s?.valor || 0,
      };
    })
    .filter((item) => item.quantidade > 0);

  // Máquinas alocadas
  const locacoesObra = data.locacoes.filter((l) => l.obraId === obra.id && l.status !== 'cancelada');

  // Serviços e empreitadas vinculados a esta obra
  const servicosObra = (data.servicos || []).filter((s) => s.obraId === obra.id);

  // Operários que atuam nesta obra
  const operariosObra = data.funcionarios.filter((f) => {
    return (
      f.obraPadraoId === obra.id ||
      Object.values(data.apontamentos).some(
        (ap) =>
          ap.funcionarioId === f.id &&
          (ap.centroId === obra.id || (ap.centroIds && ap.centroIds.includes(obra.id))),
      )
    );
  });

  const prazoTotal = Math.max(1, diffDays(obra.dataInicio, obra.previsaoEntrega));
  const decorrido = Math.max(0, Math.min(1, diffDays(obra.dataInicio, r.hoje) / prazoTotal));

  return (
    <>
      <Dialog
        open={!!obra}
        onClose={onClose}
        title={obra.nome}
        subtitle={`${obra.cliente || 'Sem cliente'} • ${obra.endereco || 'Endereço não informado'}`}
        wide
      >
        <div className="space-y-6">
          {/* Fase Atual Clicável */}
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <FaseObraStepper obraId={obra.id} obraNome={obra.nome} faseAtual={obra.fase || 'fundacao'} />
          </div>

          {/* Cabeçalho de Status e Prazos */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <span className="text-xs text-muted">Status</span>
              <div className="mt-1">
                <Badge tone={obra.status === 'andamento' ? 'green' : 'neutral'}>{LABEL_OBRA_STATUS[obra.status]}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <span className="text-xs text-muted">Responsável Técnico</span>
              <div className="mt-1 text-sm font-semibold truncate">{obra.responsavel || 'Não especificado'}</div>
              {obra.arquiteto && <div className="text-[11px] text-muted truncate">Arq: {obra.arquiteto}</div>}
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <span className="text-xs text-muted">Período de Obra</span>
              <div className="mt-1 text-xs font-semibold flex items-center gap-1">
                <Calendar className="size-3.5 text-muted" />
                {fmtDate(obra.dataInicio)} a {fmtDate(obra.previsaoEntrega)}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <span className="text-xs text-muted">Prazo Decorrido</span>
              <div className="mt-1 text-sm font-semibold">{fmtPct(decorrido)}</div>
            </div>
          </div>

          {/* Orçamento e Custos */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs text-muted">Consumo do Orçamento</span>
                <div className="text-lg font-bold">
                  {fmtBRL(ro?.comprometido || 0)} <span className="text-xs font-normal text-muted">de {fmtBRL(obra.orcamento)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Saldo Restante</span>
                <div className={`text-lg font-bold ${(ro?.saldoOrcamento || 0) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {fmtBRL(ro?.saldoOrcamento || 0)}
                </div>
              </div>
            </div>
            <Progress value={ro?.consumoPct || 0} className="mb-4" />

            <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-center text-xs sm:grid-cols-4">
              <div>
                <span className="text-muted">Materiais</span>
                <div className="font-semibold text-brand">{fmtBRL(ro?.porGrupo.materiais || 0)}</div>
              </div>
              <div>
                <span className="text-muted">Mão de Obra</span>
                <div className="font-semibold text-sky-500">{fmtBRL(ro?.porGrupo.mao_de_obra || 0)}</div>
              </div>
              <div>
                <span className="text-muted">Locações</span>
                <div className="font-semibold text-violet-400">{fmtBRL(ro?.porGrupo.locacao || 0)}</div>
              </div>
              <div>
                <span className="text-muted">Empreitadas</span>
                <div className="font-semibold text-emerald-500">{fmtBRL(ro?.porGrupo.servicos || 0)}</div>
              </div>
            </div>
          </Card>

          {/* Abas / Blocos de Controle Específico por Obra */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Materiais em Estoque na Obra */}
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
                <Package className="size-4 text-brand" />
                Materiais Alocados / Saldo Atual
              </div>
              {materiaisComSaldo.length === 0 ? (
                <p className="text-xs text-muted italic">Nenhum material com saldo remanescente nesta obra.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {materiaisComSaldo.map(({ material, quantidade, valor }) => (
                    <li key={material.id} className="flex justify-between items-center text-xs border-b border-line/60 pb-1.5">
                      <div>
                        <span className="font-medium text-fg">{material.nome}</span>
                        <span className="text-muted ml-1.5">({LABEL_UNIDADE[material.unidade]})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{quantidade}</span>
                        <div className="text-[10px] text-muted">{fmtBRL(valor)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Máquinas e Equipamentos */}
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
                <Construction className="size-4 text-violet-400" />
                Máquinas e Equipamentos Locados
              </div>
              {locacoesObra.length === 0 ? (
                <p className="text-xs text-muted italic">Nenhum equipamento alugado para esta obra.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {locacoesObra.map((l) => (
                    <li key={l.id} className="flex justify-between items-center text-xs border-b border-line/60 pb-1.5">
                      <div>
                        <span className="font-medium text-fg">{l.equipamento}</span>
                        <div className="text-[10px] text-muted">
                          Qtd: {l.quantidade} • {l.status === 'ativa' ? 'Em operação' : 'Devolvida'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{fmtBRL(l.valor)}</span>
                        <div className="text-[10px] text-muted">{l.tarifa}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Serviços e Empreitadas Contratados */}
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Briefcase className="size-4 text-emerald-500" />
                Serviços Terceirizados & Empreitadas ({servicosObra.length})
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="size-3.5" />}
                onClick={() => {
                  setServicoParaEditar(null);
                  setServicoFormAberto(true);
                }}
              >
                Nova Empreitada
              </Button>
            </div>

            {servicosObra.length === 0 ? (
              <p className="text-xs text-muted italic">
                Nenhum contrato de serviço fechado ou empreitada cadastrado para esta obra.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {servicosObra.map((s) => {
                  const pagas = s.etapas.filter((e) => e.status === 'pago').reduce((acc, e) => acc + e.valor, 0);
                  const pctPago = s.valorTotal > 0 ? pagas / s.valorTotal : 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setServicoSelecionado(s)}
                      className="cursor-pointer rounded-lg border border-line bg-surface-2/60 p-3 transition-colors hover:border-brand/40 hover:bg-surface-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-fg truncate">{s.prestadorNome}</div>
                          <div className="text-[11px] text-muted truncate">{s.funcao} • {s.descricao}</div>
                        </div>
                        <Badge tone={s.status === 'concluido' ? 'green' : s.status === 'andamento' ? 'blue' : 'neutral'}>
                          {LABEL_STATUS_SERVICO[s.status]}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-muted">Contrato: {fmtBRL(s.valorTotal)}</div>
                          <div className="text-[10px] text-emerald-500 font-medium">Pago: {fmtBRL(pagas)} ({fmtPct(pctPago)})</div>
                        </div>
                        <div className="text-[10px] text-muted">
                          {s.etapas.length} {s.etapas.length === 1 ? 'parcela' : 'etapas'}
                        </div>
                      </div>
                      <Progress value={pctPago} className="mt-2 h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Equipe alocada */}
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
              <HardHat className="size-4 text-sky-400" />
              Equipe Alocada ({operariosObra.length} colaboradores)
            </div>
            <div className="flex flex-wrap gap-2">
              {operariosObra.map((op) => (
                <span key={op.id} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs">
                  <span className="font-medium text-fg">{op.apelido?.trim() ? `${op.apelido.trim()} (${op.nome})` : op.nome}</span>
                  <span className="text-[10px] text-muted uppercase">({op.funcao})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Zona Administrativa / Ações da Obra */}
          {isAdmin && (
            <div className="flex items-center justify-between pt-4 border-t border-line/60">
              <span className="text-xs text-muted">Ações administrativas:</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                icon={<Trash2 className="size-4" />}
                onClick={() => setModalExcluirAberto(true)}
              >
                Excluir Obra
              </Button>
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmarExclusaoObraDialog
        open={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        obra={obra}
        onConfirmado={() => {
          setModalExcluirAberto(false);
          onClose();
        }}
      />

      {/* Modais de Serviços */}
      {servicoFormAberto && (
        <ServicoFormDialog
          open={servicoFormAberto}
          onClose={() => setServicoFormAberto(false)}
          servicoParaEditar={servicoParaEditar}
          obraPadraoId={obra.id}
        />
      )}

      {servicoSelecionado && (
        <DetalhesServicoDialog
          servico={servicoSelecionado}
          onClose={() => setServicoSelecionado(null)}
          onEditar={(srv) => {
            setServicoSelecionado(null);
            setServicoParaEditar(srv);
            setServicoFormAberto(true);
          }}
        />
      )}
    </>
  );
}
