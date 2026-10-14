import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Perfil, ThemePref } from '@/domain/types';

interface UiState {
  theme: ThemePref;
  perfil: Perfil;
  sidebarCollapsed: boolean;
  setTheme: (t: ThemePref) => void;
  setPerfil: (p: Perfil) => void;
  toggleSidebar: () => void;
}

export const THEME_KEY = 'construtec:theme';

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: (localStorage.getItem(THEME_KEY) as ThemePref) || 'system',
      perfil: 'admin',
      sidebarCollapsed: false,
      setTheme: (theme) => {
        // chave simples lida pelo script inline do index.html (evita flash de tema)
        localStorage.setItem(THEME_KEY, theme);
        set({ theme });
      },
      setPerfil: (perfil) => set({ perfil }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'construtec:ui', partialize: (s) => ({ perfil: s.perfil, sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
