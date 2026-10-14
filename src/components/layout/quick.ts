import { create } from 'zustand';

/** Ações rápidas globais (abertas pela bottom bar, atalhos ou botões). */
interface QuickState {
  despesa: boolean;
  menu: boolean;
  open: (k: 'despesa' | 'menu') => void;
  close: (k: 'despesa' | 'menu') => void;
}

export const useQuick = create<QuickState>()((set) => ({
  despesa: false,
  menu: false,
  open: (k) => set({ [k]: true } as Partial<QuickState>),
  close: (k) => set({ [k]: false } as Partial<QuickState>),
}));
