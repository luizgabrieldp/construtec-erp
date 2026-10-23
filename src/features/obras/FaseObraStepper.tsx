import { useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { useErp, useData } from '@/data/store';
import { useIsAdmin } from '@/hooks';
import { toast } from '@/components/ui/Toast';
import { getFasesObra, getLabelFase } from '@/domain/labels';
import { cn } from '@/lib/utils';
import { FasesObraConfigDialog } from './FasesObraConfigDialog';

interface FaseObraStepperProps {
  obraId?: string;
  obraNome?: string;
  faseAtual?: string;
  onChange?: (novaFase: string) => void;
  compact?: boolean;
  className?: string;
}

export function FaseObraStepper({
  obraId,
  obraNome,
  faseAtual = 'fundacao',
  onChange,
  compact = false,
  className,
}: FaseObraStepperProps) {
  const data = useData();
  const isAdmin = useIsAdmin();
  const mutate = useErp((s) => s.mutate);
  const [configOpen, setConfigOpen] = useState(false);

  const obra = obraId ? data.obras.find((o) => o.id === obraId) : null;
  const fases = getFasesObra(obra);
  const labelFaseAtual = getLabelFase(faseAtual, obra);

  const faseAtivaIndex = fases.findIndex((f) => f.id === faseAtual);
  const indexAtual = faseAtivaIndex >= 0 ? faseAtivaIndex : 0;

  const handleClickFase = (novaFase: string, label: string) => {
    if (onChange) {
      onChange(novaFase);
      return;
    }

    if (!obraId) return;

    mutate(
      (d) => {
        const ob = d.obras.find((o) => o.id === obraId);
        if (ob) {
          ob.fase = novaFase;
        }
      },
      {
        acao: 'Obras',
        descricao: `Alterou fase da obra ${obraNome || obraId} para ${label}`,
      },
    );

    toast(`Fase da obra atualizada: ${label}`);
  };

  return (
    <>
      <div className={cn('w-full space-y-1.5', className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted shrink-0">
              Fase Atual:
            </span>
            <span className="font-bold text-fg truncate">
              {labelFaseAtual}
            </span>
          </div>

          {isAdmin && obra && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfigOpen(true);
              }}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-surface hover:text-brand transition-colors cursor-pointer shrink-0"
              title="Personalizar fases desta obra"
            >
              <Settings2 className="size-3" />
              <span>Personalizar</span>
            </button>
          )}
        </div>

        {/* Grade com os botões das fases da obra */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, fases.length)}, minmax(0, 1fr))`,
          }}
        >
          {fases.map((f, idx) => {
            const isAtiva = f.id === faseAtual;
            const isConcluida = idx < indexAtual;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleClickFase(f.id, f.label)}
                title={`Clique para definir fase: ${f.label}`}
                className={cn(
                  'group relative flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all cursor-pointer select-none',
                  isAtiva
                    ? 'border-brand bg-brand text-white shadow-xs font-bold'
                    : isConcluida
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/20'
                    : 'border-line/80 bg-surface-2/60 text-muted hover:border-brand/40 hover:text-fg hover:bg-surface-2',
                  compact && 'py-1 text-[10px]',
                )}
              >
                <div className="flex items-center gap-1">
                  {isConcluida ? (
                    <Check className="size-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        'text-[10px] font-bold tabular-nums',
                        isAtiva ? 'text-white' : 'text-muted/80',
                      )}
                    >
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-0.5 truncate text-[10px] leading-tight w-full',
                    isAtiva ? 'font-bold text-white' : 'font-medium',
                  )}
                  title={f.label}
                >
                  {f.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {obra && (
        <FasesObraConfigDialog
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          obra={obra}
        />
      )}
    </>
  );
}
