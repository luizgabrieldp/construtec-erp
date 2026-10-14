import { Monitor, Moon, Sun, HardHat, ShieldCheck } from 'lucide-react';
import { useUi } from '@/data/ui';
import { useAuth } from '@/data/auth';
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

/**
 * Exibe o cartão informativo fixo da conta conectada.
 * Substitui o antigo switcher, impedindo que o encarregado altere seu próprio papel.
 */
export function UserInfoCard({ full, compact }: { full?: boolean; compact?: boolean }) {
  const usuario = useAuth((s) => s.usuarioAtual);
  const perfil = usuario?.perfil || 'encarregado';
  const isAdmin = perfil === 'admin';
  const Icon = isAdmin ? ShieldCheck : HardHat;
  const label = isAdmin ? 'Administrador' : 'Encarregado da Obra';
  const nome = usuario?.nome || (isAdmin ? 'Administrador' : 'Encarregado');

  if (compact) {
    return (
      <div
        title={`Conectado: ${nome} (${label})`}
        className={cn(
          'grid size-10 place-items-center rounded-xl border border-line bg-surface-2 mx-auto',
          isAdmin ? 'text-brand' : 'text-amber-500'
        )}
      >
        <Icon className="size-5" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2.5 select-none',
        full && 'w-full'
      )}
    >
      <div
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg border',
          isAdmin
            ? 'border-brand/30 bg-brand/10 text-brand'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-fg leading-tight">
          {nome}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              'inline-block size-1.5 rounded-full',
              isAdmin ? 'bg-brand' : 'bg-amber-500'
            )}
          />
          <span className="truncate text-[10px] font-medium text-muted">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// Mantido como alias para compatibilidade com outros arquivos
export const ProfileSwitcher = UserInfoCard;
