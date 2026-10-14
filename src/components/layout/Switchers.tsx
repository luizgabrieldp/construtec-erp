import { Monitor, Moon, Sun, HardHat, ShieldCheck } from 'lucide-react';
import { useUi } from '@/data/ui';
import type { Perfil, ThemePref } from '@/domain/types';
import { cn } from '@/lib/utils';

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  return (
    <div role="radiogroup" aria-label="Tema" className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-0.5', className)}>
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'grid size-8 place-items-center rounded-[10px] transition-colors',
            theme === value ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          <Icon className="size-4" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

const PERFIS: { value: Perfil; label: string; icon: typeof HardHat }[] = [
  { value: 'admin', label: 'Administrador', icon: ShieldCheck },
  { value: 'encarregado', label: 'Encarregado de Obra', icon: HardHat },
];

export function ProfileSwitcher({ full, compact }: { full?: boolean; compact?: boolean }) {
  const perfil = useUi((s) => s.perfil);
  const setPerfil = useUi((s) => s.setPerfil);
  const atual = PERFIS.find((p) => p.value === perfil)!;
  const Icon = atual.icon;

  if (compact) {
    const proximo: Perfil = perfil === 'admin' ? 'encarregado' : 'admin';
    const proximoLabel = PERFIS.find((p) => p.value === proximo)!.label;
    return (
      <button
        type="button"
        onClick={() => setPerfil(proximo)}
        title={`Perfil: ${atual.label} (Clique para alternar para ${proximoLabel})`}
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface-2 hover:bg-surface text-fg transition-colors mx-auto cursor-pointer"
      >
        <Icon className={cn('size-5', perfil === 'admin' ? 'text-brand' : 'text-amber-500')} />
        <span className="sr-only">Perfil: {atual.label}</span>
      </button>
    );
  }

  return (
    <label className={cn('relative flex items-center gap-2 rounded-xl border border-line bg-surface-2 pl-2.5 pr-1 h-9', full && 'w-full')}>
      <Icon className={cn('size-4 shrink-0', perfil === 'admin' ? 'text-brand' : 'text-amber-500')} />
      <span className="sr-only">Perfil</span>
      <select
        value={perfil}
        onChange={(e) => setPerfil(e.target.value as Perfil)}
        className="h-full flex-1 cursor-pointer appearance-none bg-transparent pr-5 text-xs font-semibold text-fg outline-none"
      >
        {PERFIS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-muted">▾</span>
    </label>
  );
}
