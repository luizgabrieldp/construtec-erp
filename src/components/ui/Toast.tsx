import { create } from 'zustand';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
}

let n = 0;
export const useToast = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++n;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
}));

export const toast = (message: string, tone?: Toast['tone']) => useToast.getState().push(message, tone);

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
            'border-line bg-surface text-fg',
          )}
        >
          {t.tone === 'success' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <AlertTriangle className="size-4 text-red-500" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
