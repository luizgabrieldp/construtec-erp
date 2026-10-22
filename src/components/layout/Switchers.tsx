import { Monitor, Moon, Sun, HardHat, ShieldCheck } from 'lucide-react';
import { useUi } from '@/data/ui';
import { useAuth } from '@/data/auth';
import { useSyncStatus, forcarSincronizacaoAgora } from '@/data/repository';
import type { ThemePref } from '@/domain/types';
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
 * Exibe o cartão informativo fixo da conta conectada, incluindo o status de conexão em tempo real.
 * Substitui o antigo switcher, impedindo que o encarregado altere seu próprio papel.
 */
export function UserInfoCard({ full, compact }: { full?: boolean; compact?: boolean }) {
  const usuario = useAuth((s) => s.usuarioAtual);
  const { online, syncing, latencyMs, pendingCount } = useSyncStatus();
  const perfil = usuario?.perfil || 'encarregado';
  const isAdmin = perfil === 'admin';
  const Icon = isAdmin ? ShieldCheck : HardHat;
  const label = isAdmin ? 'Administrador' : 'Encarregado da Obra';
  const nome = usuario?.nome || (isAdmin ? 'Administrador' : 'Encarregado');

  const statusText = !online
    ? `Offline • ${pendingCount > 0 ? `${pendingCount} pend.` : 'Salvo local'}`
    : syncing
      ? 'Sincronizando...'
      : `Online • ${latencyMs !== null ? `${latencyMs}ms` : 'OK'}`;

  const statusTooltip = !online
    ? 'Sem conexão no momento. Suas edições estão salvas neste aparelho e subirão automaticamente assim que a internet voltar.'
    : syncing
      ? 'Sincronizando e mesclando alterações em tempo real com a nuvem...'
      : 'Conectado em tempo real com a nuvem. Clique para verificar a latência e sincronizar agora.';

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void forcarSincronizacaoAgora()}
        title={`Conectado: ${nome} (${label}) — ${statusText}`}
        className={cn(
          'relative grid size-10 place-items-center rounded-xl border border-line bg-surface-2 mx-auto cursor-pointer hover:bg-surface transition-colors',
          isAdmin ? 'text-brand' : 'text-amber-500'
        )}
      >
        <Icon className="size-5" />
        <span className="sr-only">{label} — {statusText}</span>
        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-surface p-0.5">
          {!online ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
          ) : syncing ? (
            <span className="inline-flex size-2 rounded-full bg-brand animate-pulse" />
          ) : (
            <span className="inline-flex size-2 rounded-full bg-emerald-500" />
          )}
        </span>
      </button>
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
          'grid size-9 shrink-0 place-items-center rounded-lg border',
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
        <div className="truncate text-[10px] font-medium text-muted mt-0.5">
          {label}
        </div>
        <button
          type="button"
          onClick={() => void forcarSincronizacaoAgora()}
          title={statusTooltip}
          className={cn(
            'mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer tabular-nums',
            !online
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              : syncing
                ? 'border-brand/30 bg-brand/10 text-brand hover:bg-brand/15'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
          )}
        >
          {!online ? (
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
            </span>
          ) : syncing ? (
            <span className="inline-flex size-1.5 shrink-0 rounded-full bg-brand animate-pulse" />
          ) : (
            <span className="inline-flex size-1.5 shrink-0 rounded-full bg-emerald-500" />
          )}
          <span className="truncate">{statusText}</span>
        </button>
      </div>
    </div>
  );
}

// Mantido como alias para compatibilidade com outros arquivos
export const ProfileSwitcher = UserInfoCard;
