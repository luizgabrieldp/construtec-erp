import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

const suportaClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

/**
 * Modal sobre <dialog> nativo: top layer, foco preso e Esc nativos.
 * Light-dismiss via closedby="any" com fallback para Safari.
 */
export function Dialog({ open, onClose, title, subtitle, children, footer, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCloseEvt = () => onClose();
    el.addEventListener('close', onCloseEvt);
    const onClick = (e: MouseEvent) => {
      if (suportaClosedBy || e.target !== el) return;
      const r = el.getBoundingClientRect();
      const dentro = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
      if (!dentro) el.close();
    };
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('close', onCloseEvt);
      el.removeEventListener('click', onClick);
    };
  }, [onClose]);

  const titleId = `dlg-${title.replace(/\W+/g, '-')}`;
  return (
    <dialog
      ref={ref}
      className="cx-dialog"
      aria-labelledby={titleId}
      style={wide ? { width: 'min(860px, calc(100vw - 2rem))' } : undefined}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-bold text-fg">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
            <button type="button" onClick={() => ref.current?.close()} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
