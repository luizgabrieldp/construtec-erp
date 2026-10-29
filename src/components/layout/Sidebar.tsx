import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { NAV_GROUPS, navDoPerfil, type NavItem } from '@/app/nav';
import { UserInfoCard } from './Switchers';
import { useUi } from '@/data/ui';
import { useAuth } from '@/data/auth';
import { usePerfil } from '@/hooks';
import { cn } from '@/lib/utils';

export const atalhoLabel = (k: string) => `Alt+${k}`;

function NavGroup({ items, collapsed, onNavigate }: { items: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((n) => (
        <li key={n.to}>
          <NavLink
            to={n.to}
            end={n.to === '/'}
            onClick={onNavigate}
            title={collapsed ? `${n.label} (${atalhoLabel(n.key)})` : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand" aria-hidden />}
                <n.icon className="size-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{n.label}</span>
                    <kbd className="hidden rounded border border-line px-1 text-[10px] font-normal text-muted/80 group-hover:inline lg:group-hover:inline">
                      {atalhoLabel(n.key)}
                    </kbd>
                  </>
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function NavList({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const perfil = usePerfil();
  const itens = navDoPerfil(perfil);
  return (
    <nav aria-label="Principal" className="flex flex-col gap-5">
      {(Object.keys(NAV_GROUPS) as NavItem['group'][]).map((g) => {
        const grupo = itens.filter((i) => i.group === g);
        if (!grupo.length) return null;
        return (
          <div key={g}>
            {!collapsed && <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted/70">{NAV_GROUPS[g]}</div>}
            <NavGroup items={grupo} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  const logout = useAuth((s) => s.logout);
  return (
    <aside
      className={cn(
        'no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex relative overflow-hidden',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-line shrink-0', collapsed ? 'justify-center' : 'px-5')}>
        <Logo compact={collapsed} size={collapsed ? 'sm' : 'md'} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 relative flex flex-col justify-between">
        <div className="relative z-10">
          <NavList collapsed={collapsed} />
        </div>

        {/* Marca d'água do ícone grandão da CONSTRUTEC embaixo de Configurações */}
        {!collapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none my-4 flex items-center justify-center opacity-[0.06] dark:opacity-[0.08] transition-opacity"
          >
            <img
              src="/logo-emblema-trim.png"
              alt=""
              className="w-36 h-36 object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3 shrink-0 relative z-10">
        <UserInfoCard compact={collapsed} full={!collapsed} />
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Sair da conta (Logout)' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors cursor-pointer',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sair da conta</span>}
        </button>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expandir menu ( [ )' : 'Recolher menu ( [ )'}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <ChevronsRight className="size-4 shrink-0" /> : <ChevronsLeft className="size-4 shrink-0" />}
          {!collapsed && <span>Recolher menu</span>}
        </button>
      </div>
    </aside>
  );
}
