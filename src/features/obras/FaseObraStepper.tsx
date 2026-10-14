import { Check } from 'lucide-react';
import { useErp } from '@/data/store';
import { toast } from '@/components/ui/Toast';
import type { ObraFase } from '@/domain/types';
import { FASES_OBRA_LISTA, LABEL_OBRA_FASE } from '@/domain/labels';
import { cn } from '@/lib/utils';

interface FaseObraStepperProps {
  obraId?: string;
  obraNome?: string;
  faseAtual?: ObraFase;
  onChange?: (novaFase: ObraFase) => void;
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
  const mutate = useErp((s) => s.mutate);

  const faseAtivaIndex = FASES_OBRA_LISTA.findIndex((f) => f.id === faseAtual);
  const indexAtual = faseAtivaIndex >= 0 ? faseAtivaIndex : 0;

  const handleClickFase = (novaFase: ObraFase, label: string) => {
    if (onChange) {
      onChange(novaFase);
      return;
    }

    if (!obraId) return;

    mutate(
      (d) => {
        const obra = d.obras.find((o) => o.id === obraId);
        if (obra) {
          obra.fase = novaFase;
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
    <div className={cn('w-full space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Fase Atual da Obra:
        </span>
        <span className="font-bold text-fg">
          {LABEL_OBRA_FASE[faseAtual]}
        </span>
      </div>

      {/* Grade com os 5 botões de fases clicáveis */}
      <div className="grid grid-cols-5 gap-1">
        {FASES_OBRA_LISTA.map((f, idx) => {
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
              >
                {f.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
