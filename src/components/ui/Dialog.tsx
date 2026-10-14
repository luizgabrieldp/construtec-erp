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

let openDialogCount = 0;
let savedScrollY = 0;

export function acquireScrollLock() {
  openDialogCount++;
  if (openDialogCount === 1) {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add('cx-dialog-open');
    document.documentElement.classList.add('cx-dialog-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
}

export function releaseScrollLock() {
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0) {
    document.body.classList.remove('cx-dialog-open');
    document.documentElement.classList.remove('cx-dialog-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Modal sobre <dialog> nativo com:
 * - Top layer e Esc nativos
 * - Centralização simétrica no mobile, tablet e desktop
 * - Trava de rolagem corporal absoluta (scroll lock) e isolamento estrito de touchmove
 * - Contenção de overscroll no container de rolagem flexível
 */
export function Dialog({ open, onClose, title, subtitle, children, footer, wide, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Trava de rolagem corporal e cancelamento de touchmove fora do conteúdo rolável do diálogo
  useEffect(() => {
    if (!open) return;

    acquireScrollLock();

    const onTouchMove = (e: TouchEvent) => {
      const contentEl = contentRef.current;
      // Se o toque ocorreu fora do container interno rolável (no backdrop, bordas, cabeçalho ou rodapé)
      if (!contentEl || !contentEl.contains(e.target as Node)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      releaseScrollLock();
      document.removeEventListener('touchmove', onTouchMove);
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
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 shrink-0">
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
          <div
            ref={contentRef}
            className="cx-dialog-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 overscroll-contain"
          >
            {children}
          </div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3 shrink-0">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
