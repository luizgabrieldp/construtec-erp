import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Menu, ShieldAlert, LogOut, Plus } from 'lucide-react';
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
import { isTyping, useHoje } from '@/hooks';
import { fmtDateLong } from '@/lib/format';

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
  const open = useQuick((s) => s.open);
  const atual = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md md:px-6">
      {/* Botão Hambúrguer para telas mobile e tablet */}
      <button
        type="button"
        onClick={() => open('menu')}
        className="lg:hidden size-10 inline-flex items-center justify-center rounded-xl border border-line bg-surface-2/60 text-fg hover:bg-surface-2 active:scale-95 transition-all cursor-pointer"
        aria-label="Abrir menu de navegação"
      >
        <Menu className="size-5" />
      </button>

      {/* Ícone oficial CONSTRUTEC isolado (sem texto escrito) no topo */}
      <div className="flex items-center">
        <img
          src="/logo-emblema-trim.png"
          alt="CONSTRUTEC"
          className="size-8 object-contain shrink-0 select-none"
        />
      </div>

      {/* Título e data da página no desktop */}
      <div className="hidden min-w-0 flex-1 lg:block">
        <div className="truncate text-sm font-semibold text-fg">{atual?.label ?? 'CONSTRUTEC'}</div>
        <div className="text-xs capitalize text-muted">{fmtDateLong(hoje)}</div>
      </div>

      {/* Título sucinto no tablet/mobile */}
      <div className="min-w-0 flex-1 truncate text-xs font-semibold text-fg lg:hidden">
        {atual?.label}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher className="inline-flex" />
      </div>
    </header>
  );
}

function MobileMenu() {
  const openMenu = useQuick((s) => s.menu);
  const close = useQuick((s) => s.close);
  const open = useQuick((s) => s.open);
  const logout = useAuth((s) => s.logout);
  return (
    <Dialog open={openMenu} onClose={() => close('menu')} title="Menu do Sistema" subtitle="Navegação geral do canteiro e configurações">
      <div className="flex flex-col gap-4">
        {/* Logotipo oficial no topo do menu móvel */}
        <div className="flex items-center justify-between pb-1 border-b border-line">
          <Logo size="sm" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Petrolina - PE</span>
        </div>

        <div className="flex flex-col gap-2">
          <UserInfoCard full />
          <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span className="text-xs font-semibold text-muted">Tema da Interface</span>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Atalho rápido para lançar despesa no canteiro */}
        <button
          type="button"
          onClick={() => {
            close('menu');
            open('despesa');
          }}
          className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-3.5 py-2.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" />
            Lançar Despesa Rápida (Canteiro)
          </span>
          <span className="text-[10px] text-muted">Alt+D</span>
        </button>

        <NavList onNavigate={() => close('menu')} />

        <div className="pt-2 border-t border-line">
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:bg-red-500/10 justify-start text-xs font-semibold"
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
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-10 pt-6 md:px-6 lg:px-8">
          {podeAcessar(pathname, perfilEfetivo) ? <Outlet /> : <AcessoRestrito />}
        </main>
      </div>
      <MobileMenu />
      <DespesaRapidaDialog />
      <Toaster />
    </div>
  );
}
