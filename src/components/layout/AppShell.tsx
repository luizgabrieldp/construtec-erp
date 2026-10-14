import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Building2, ClipboardCheck, LayoutDashboard, Menu, Plus, ShieldAlert, CheckSquare, Users, Settings, LogOut } from 'lucide-react';
import { Sidebar, NavList } from './Sidebar';
import { UserInfoCard, ThemeSwitcher } from './Switchers';
import { useQuick } from './quick';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { Toaster } from '@/components/ui/Toast';
import { DespesaRapidaDialog } from '@/features/despesas/DespesaRapidaDialog';
import { NAV, navDoPerfil, podeAcessar } from '@/app/nav';
import { useUi } from '@/data/ui';
import { useAuth } from '@/data/auth';
import { iniciarVerificadorTarefas } from '@/lib/notifications';
import { isTyping, useHoje, useIsAdmin } from '@/hooks';
import { fmtDateLong } from '@/lib/format';
import { cn } from '@/lib/utils';

const codeDaTecla = (k: string) => (k === ',' ? 'Comma' : k === 's' ? 'KeyS' : `Digit${k}`);

function useAtalhos() {
  const navigate = useNavigate();
  const perfil = useUi((s) => s.perfil);
  const toggle = useUi((s) => s.toggleSidebar);
  const open = useQuick((s) => s.open);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey) return;
      if (e.altKey) {
        const item = navDoPerfil(perfil).find((n) => codeDaTecla(n.key) === e.code);
        if (item) {
          e.preventDefault();
          navigate(item.to);
        } else if (e.code === 'KeyD') {
          e.preventDefault();
          open('despesa');
        }
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, perfil, toggle, open]);
}

function Topbar() {
  const hoje = useHoje();
  const { pathname } = useLocation();
  const atual = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md md:px-6">
      <div className="md:hidden">
        <Logo size="sm" />
      </div>
      <div className="hidden min-w-0 flex-1 md:block">
        <div className="truncate text-sm font-semibold text-fg">{atual?.label ?? 'CONSTRUTEC'}</div>
        <div className="text-xs capitalize text-muted">{fmtDateLong(hoje)}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher className="inline-flex" />
      </div>
    </header>
  );
}

function BottomBar() {
  const isAdmin = useIsAdmin();
  const open = useQuick((s) => s.open);
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold';
  const cls = ({ isActive }: { isActive: boolean }) => cn(item, isActive ? 'text-brand font-bold' : 'text-muted');
  return (
    <nav
      aria-label="Ações rápidas do canteiro"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex h-[calc(68px+env(safe-area-inset-bottom,0px))] items-stretch border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
    >
      <NavLink to="/" end className={cls}>
        <LayoutDashboard className="size-5" />
        Início
      </NavLink>
      <NavLink to="/obras" className={cls}>
        <Building2 className="size-5" />
        Obras
      </NavLink>
      <NavLink to="/equipe" className={cls}>
        <ClipboardCheck className="size-5" />
        Presença
      </NavLink>
      <NavLink to="/tarefas" className={cls}>
        <CheckSquare className="size-5" />
        Tarefas
      </NavLink>
      {isAdmin && (
        <NavLink to="/folha" className={cls}>
          <Users className="size-5" />
          Folha
        </NavLink>
      )}
      <NavLink to="/configuracoes" className={cls}>
        <Settings className="size-5" />
        Ajustes
      </NavLink>
      <button type="button" onClick={() => open('menu')} className={cn(item, 'text-muted')}>
        <Menu className="size-5" />
        Menu
      </button>
    </nav>
  );
}

function MobileMenu() {
  const openMenu = useQuick((s) => s.menu);
  const close = useQuick((s) => s.close);
  const logout = useAuth((s) => s.logout);
  return (
    <Dialog open={openMenu} onClose={() => close('menu')} title="Menu">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <UserInfoCard full />
          <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span className="text-xs font-semibold text-muted">Tema</span>
            <ThemeSwitcher />
          </div>
        </div>
        <NavList onNavigate={() => close('menu')} />
        <div className="pt-2 border-t border-line">
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:bg-red-500/10 justify-start text-xs"
            icon={<LogOut className="size-4" />}
            onClick={() => {
              close('menu');
              logout();
            }}
          >
            Sair da Conta (Logout)
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AcessoRestrito() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <ShieldAlert className="mx-auto size-12 text-amber-500" />
      <h1 className="mt-4 text-xl font-bold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted">
        Esta área é restrita para o perfil Administrador. O seu perfil atual é Encarregado da Obra.
      </p>
    </div>
  );
}

export function AppShell() {
  useAtalhos();
  const { pathname } = useLocation();
  const usuarioAtual = useAuth((s) => s.usuarioAtual);
  const perfilEfetivo = usuarioAtual?.perfil || 'encarregado';

  useEffect(() => {
    if (usuarioAtual && useUi.getState().perfil !== usuarioAtual.perfil) {
      useUi.getState().setPerfil(usuarioAtual.perfil);
    }
  }, [usuarioAtual]);

  useEffect(() => {
    const cancelar = iniciarVerificadorTarefas(60000);
    return cancelar;
  }, []);

  if (!usuarioAtual) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-10 lg:px-8">
          {podeAcessar(pathname, perfilEfetivo) ? <Outlet /> : <AcessoRestrito />}
        </main>
      </div>
      <BottomBar />
      <MobileMenu />
      <DespesaRapidaDialog />
      <Toaster />
    </div>
  );
}
