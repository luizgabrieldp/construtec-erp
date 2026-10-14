import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
}

const suportaClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

/**
 * Modal sobre <dialog> nativo com:
 * - Top layer e Esc nativos
 * - Centralização perfeita no mobile, tablet e desktop
 * - Trava de rolagem (scroll lock) no body e touchmove cancelado no backdrop
 * - Contenção de overscroll estrita para evitar travamentos em tabelas ao fundo
 */
export function Dialog({ open, onClose, title, subtitle, children, footer, wide, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Trava de rolagem e prevenção de toques passando para o conteúdo de fundo no mobile
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const el = ref.current;
    if (!el) return;

    // Cancela toques no backdrop para não disparar deslizamento inercial da página de trás
    const onTouchMove = (e: TouchEvent) => {
      if (e.target === el) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      el.removeEventListener('touchmove', onTouchMove);
    };
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
      className={cn('cx-dialog', wide && 'cx-dialog-wide', className)}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 pr-2">
              <h2 id={titleId} className="text-base font-bold text-fg tracking-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted leading-relaxed">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="size-9 shrink-0 inline-flex items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted hover:bg-surface-2 hover:text-fg active:scale-95 transition-all cursor-pointer"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="cx-dialog-scroll overflow-y-auto px-5 py-4 overscroll-contain">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
