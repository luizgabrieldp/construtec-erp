import { useEffect, useMemo, useState } from 'react';
import { useUi } from '@/data/ui';
import { useData } from '@/data/store';
import { useAuth } from '@/data/auth';
import { calcularResumo } from '@/domain/selectors';
import { today } from '@/lib/dates';

/** Aplica o tema no <html> e reage a mudanças do sistema quando em "system". */
export function useThemeEffect() {
  const theme = useUi((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isSystemDark = !!mq.matches;
      const dark = theme === 'dark' || (theme === 'system' && isSystemDark);
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(dark ? 'dark' : 'light');
      const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
      if (meta) meta.content = theme === 'system' ? 'light dark' : theme;
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111A24' : '#F8FAFC');
    };
    apply();
    if (mq.addEventListener) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(apply);
      return () => (mq as any).removeListener(apply);
    }
  }, [theme]);
}

/** Data de hoje, atualizada na virada do dia (relevante para o Modo TV ligado 24h). */
export function useHoje() {
  const [hoje, setHoje] = useState(today());
  useEffect(() => {
    const t = setInterval(() => {
      const h = today();
      setHoje((prev) => (prev === h ? prev : h));
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  return hoje;
}

/** Resumo financeiro/operacional derivado — recalculado a cada alteração de dados. */
export function useResumo() {
  const data = useData();
  const hoje = useHoje();
  return useMemo(() => calcularResumo(data, hoje), [data, hoje]);
}

export function usePerfil() {
  const usuario = useAuth((s) => s.usuarioAtual);
  const perfilUi = useUi((s) => s.perfil);
  return usuario?.perfil ?? perfilUi;
}

export function useIsAdmin() {
  const perfil = usePerfil();
  return perfil === 'admin';
}

/** Verifica se o foco está num campo editável (para não capturar atalhos). */
export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
}
