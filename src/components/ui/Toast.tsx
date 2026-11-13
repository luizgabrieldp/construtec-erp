import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

let n = 0;
export const useToast = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++n;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: ToastTone) => useToast.getState().push(message, tone);

function ToastItem({ item, onDismiss }: { item: Toast; onDismiss: (id: number) => void }) {
  const [pausado, setPausado] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pausado) return;
    timerRef.current = window.setTimeout(() => onDismiss(item.id), 4000);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss, pausado]);

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className={cn(
        'pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg max-w-md',
        'border-line bg-surface text-fg',
      )}
    >
      {item.tone === 'success' ? (
        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
      ) : item.tone === 'info' ? (
        <Info className="size-4 text-brand shrink-0" />
      ) : (
        <AlertTriangle className="size-4 text-red-500 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar aviso"
        className="rounded-md p-1 text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
