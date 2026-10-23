import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Building2, HardHat, DollarSign, Package } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useErp, useData } from '@/data/store';
import type { Obra } from '@/domain/types';

interface ConfirmarExclusaoObraDialogProps {
  open: boolean;
  onClose: () => void;
  obra: Obra | null;
  onConfirmado?: () => void;
}

export function ConfirmarExclusaoObraDialog({
  open,
  onClose,
  obra,
  onConfirmado,
}: ConfirmarExclusaoObraDialogProps) {
  const data = useData();
  const mutate = useErp((s) => s.mutate);
  const [confirmadoDoubleCheck, setConfirmadoDoubleCheck] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmadoDoubleCheck(false);
    }
  }, [open]);

  if (!obra) return null;

  // Levantamento de dados vinculados a esta obra
  const comprasVinculadas = data.compras.filter(
    (c) => c.status !== 'cancelada' && c.destinos?.some((d) => d.centroId === obra.id),
  ).length;
  const despesasVinculadas = data.contasPagar.filter(
    (cp) => cp.status !== 'cancelado' && cp.distribuicao?.some((d) => d.centroId === obra.id),
  ).length;
  const servicosVinculados = (data.servicos || []).filter((s) => s.obraId === obra.id).length;
  const locacoesVinculadas = data.locacoes.filter((l) => l.obraId === obra.id).length;
  const tarefasVinculadas = (data.tarefas || []).filter((t) => t.obraId === obra.id).length;
  const apontamentosVinculados = Object.values(data.apontamentos).filter(
    (ap) => ap.centroId === obra.id || (ap.centroIds && ap.centroIds.includes(obra.id)),
  ).length;
  const colaboradoresVinculados = data.funcionarios.filter((f) => f.obraPadraoId === obra.id).length;

  const totalVinculos =
    comprasVinculadas +
    despesasVinculadas +
    servicosVinculados +
    locacoesVinculadas +
    tarefasVinculadas +
    apontamentosVinculados;

  const executarExclusao = () => {
    if (!confirmadoDoubleCheck) return;

    mutate(
      (d) => {
        // Remove a obra da lista de obras
        d.obras = d.obras.filter((o) => o.id !== obra.id);

        // Limpa a obra padrão dos colaboradores vinculados
        for (const f of d.funcionarios) {
          if (f.obraPadraoId === obra.id) {
            delete f.obraPadraoId;
          }
        }
      },
      {
        acao: 'Obras',
        descricao: `Excluiu permanentemente a obra "${obra.nome}" (ID: ${obra.id})`,
      },
    );

    toast(`Obra "${obra.nome}" excluída com sucesso.`);
    onConfirmado?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Excluir Obra"
      subtitle="Atenção: Esta ação é definitiva e removerá a obra do sistema."
    >
      <div className="space-y-4">
        {/* Card em destaque com informações da obra */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3.5 space-y-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-500 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-fg flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: obra.cor || '#FF6B00' }}
                />
                {obra.nome}
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Cliente: {obra.cliente || 'Não especificado'} • Início: {obra.dataInicio}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo de impactos / vínculos */}
        <div className="rounded-xl border border-line bg-surface-2/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-fg">Impacto da exclusão:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-amber-500 shrink-0" />
              <span>{comprasVinculadas + despesasVinculadas} compras/despesas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardHat className="size-3.5 text-brand shrink-0" />
              <span>{colaboradoresVinculados} colab. alocados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="size-3.5 text-sky-500 shrink-0" />
              <span>{locacoesVinculadas} locações</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>{servicosVinculados} serviços/empreitadas</span>
            </div>
          </div>

          {totalVinculos > 0 ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-line/60">
              Os registros financeiros e de apontamento existentes serão desvinculados desta obra.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-line/60">
              Esta obra não possui despesas ou apontamentos vinculados. Pode ser excluída com total segurança.
            </p>
          )}
        </div>

        {/* Double-check explícito exigido pelo usuário */}
        <div className="rounded-xl border border-line bg-surface p-3">
          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-fg">
            <input
              type="checkbox"
              checked={confirmadoDoubleCheck}
              onChange={(e) => setConfirmadoDoubleCheck(e.target.checked)}
              className="mt-0.5 size-4 rounded border-line text-red-600 focus:ring-red-500"
            />
            <span className="leading-tight">
              Estou ciente de que esta ação é permanente e confirmo que desejo{' '}
              <strong>apagar a obra &ldquo;{obra.nome}&rdquo;</strong> do sistema.
            </span>
          </label>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!confirmadoDoubleCheck}
            icon={<Trash2 className="size-4" />}
            onClick={executarExclusao}
          >
            Sim, Excluir Obra Definitivamente
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
