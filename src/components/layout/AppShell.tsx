import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Menu, ShieldAlert, LogOut, X, WifiOff, RefreshCw } from 'lucide-react';
import { Sidebar, NavList } from './Sidebar';
import { UserInfoCard, ThemeSwitcher } from './Switchers';
import { useQuick } from './quick';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui';
import { acquireScrollLock, releaseScrollLock } from '@/components/ui/Dialog';
import { Toaster } from '@/components/ui/Toast';
import { NAV, navDoPerfil, podeAcessar } from '@/app/nav';
import { useUi } from '@/data/ui';
import { useAuth } from '@/data/auth';
import { useSyncStatus, forcarSincronizacaoAgora } from '@/data/repository';
import { iniciarVerificadorTarefas } from '@/lib/notifications';
import { isTyping, useHoje } from '@/hooks';
import { fmtDateLong } from '@/lib/format';
import { cn } from '@/lib/utils';

const codeDaTecla = (k: string) => (k === ',' ? 'Comma' : k === 's' ? 'KeyS' : `Digit${k}`);

function useAtalhos() {
  const navigate = useNavigate();
  const perfil = useUi((s) => s.perfil);
  const toggle = useUi((s) => s.toggleSidebar);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey) return;
      if (e.altKey) {
        const item = navDoPerfil(perfil).find((n) => codeDaTecla(n.key) === e.code);
        if (item) {
          e.preventDefault();
          navigate(item.to);
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
  }, [navigate, perfil, toggle]);
}

function SyncStatusBadge() {
  const { online, syncing, latencyMs, pendingCount } = useSyncStatus();

  if (!online) {
    const labelOffline =
      pendingCount > 0 ? `Offline • ${pendingCount} pendente(s)` : 'Offline • Salvo local';
    const labelOfflineCurto =
      pendingCount > 0 ? `Offline • ${pendingCount} pend.` : 'Offline • Salvo local';

    return (
      <button
        type="button"
        onClick={() => void forcarSincronizacaoAgora()}
        title="Sem conexão no momento. Suas edições estão salvas neste aparelho e subirão automaticamente assim que a internet voltar, sem apagar dados de outros usuários."
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0 tabular-nums"
      >
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
        <WifiOff className="size-3 shrink-0" />
        <span className="hidden sm:inline">{labelOffline}</span>
        <span className="sm:hidden">{labelOfflineCurto}</span>
      </button>
    );
  }

  if (syncing) {
    return (
      <button
        type="button"
        onClick={() => void forcarSincronizacaoAgora()}
        title="Sincronizando e mesclando alterações em tempo real com a nuvem..."
        className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/15 active:scale-95 transition-all cursor-pointer shrink-0 tabular-nums"
      >
        <RefreshCw className="size-3 animate-spin shrink-0" />
        <span>Sincronizando...</span>
      </button>
    );
  }

  const msTexto = latencyMs !== null ? `${latencyMs}ms` : 'OK';

  return (
    <button
      type="button"
      onClick={() => void forcarSincronizacaoAgora()}
      title="Conectado em tempo real com a nuvem. Clique para verificar a latência e sincronizar agora."
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer shrink-0 tabular-nums"
    >
      <span className="relative flex size-2 shrink-0">
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span>Online • {msTexto}</span>
    </button>
  );
}

function Topbar() {
  const hoje = useHoje();
  const { pathname } = useLocation();
  const open = useQuick((s) => s.open);
  const atual = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <header
      className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md px-4 md:px-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        paddingBottom: '0.375rem',
      }}
    >
      <div className="flex h-14 md:h-16 items-center gap-2.5 sm:gap-3">
        {/* Botão Hambúrguer acessível com alvo de toque padrão Apple HIG (44x44px) */}
        <button
          type="button"
          onClick={() => open('menu')}
          className="lg:hidden size-11 inline-flex items-center justify-center rounded-xl border border-line bg-surface-2/70 text-fg hover:bg-surface-2 active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="size-5" />
        </button>

        {/* Ícone oficial CONSTRUTEC isolado no topo */}
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

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <SyncStatusBadge />
          <ThemeSwitcher className="inline-flex" />
        </div>
      </div>
    </header>
  );
}

function MobileDrawer() {
  const openMenu = useQuick((s) => s.menu);
  const close = useQuick((s) => s.close);
  const logout = useAuth((s) => s.logout);
  const touchStartX = useRef<number | null>(null);

  // Controle de gesto swipe para fechar deslizando para a esquerda
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < -50) {
      touchStartX.current = null;
      close('menu');
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
  };

  // Trava de rolagem corporal do iOS/navegadores e atalho de teclado Esc
  useEffect(() => {
    if (!openMenu) return;

    acquireScrollLock();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('menu');
    };
    window.addEventListener('keydown', onKey);

    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu, close]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden transition-[visibility] duration-300',
        openMenu ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      )}
      style={{
        transitionDelay: openMenu ? '0ms' : '300ms',
      }}
      aria-hidden={!openMenu}
    >
      {/* Backdrop escurecido suave e com blur */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out',
          openMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => close('menu')}
        aria-hidden="true"
      />

      {/* Gaveta deslizante lateral da esquerda com safe area adaptativa */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 flex h-dvh w-[min(340px,85vw)] flex-col border-r border-line bg-surface shadow-2xl transition-transform duration-300 ease-out',
          openMenu ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de Navegação do Sistema"
      >
        {/* Topo da Gaveta com safe area respeitada e botão de fechar confortável */}
        <div className="flex h-16 items-center justify-between border-b border-line px-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Petrolina - PE</span>
          </div>
          <button
            type="button"
            onClick={() => close('menu')}
            className="size-11 inline-flex items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted hover:bg-surface-2 hover:text-fg active:scale-95 transition-all cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Conteúdo rolável da gaveta com overscroll contido */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 overscroll-contain">
          <div className="flex flex-col gap-2">
            <UserInfoCard full />
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2 bg-surface-2/30">
              <span className="text-xs font-semibold text-muted">Tema da Interface</span>
              <ThemeSwitcher />
            </div>
          </div>

          <NavList onNavigate={() => close('menu')} />
        </div>

        {/* Rodapé da gaveta respeitando safe area inferior do iPhone */}
        <div className="border-t border-line p-4 shrink-0 bg-surface">
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:bg-red-500/10 justify-start text-xs font-semibold py-3"
            icon={<LogOut className="size-4" />}
            onClick={() => {
              close('menu');
              logout();
            }}
          >
            Sair da Conta (Logout)
          </Button>
        </div>
      </aside>
    </div>
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
        <main
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-6 md:px-6 lg:px-8"
          style={{
            paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {podeAcessar(pathname, perfilEfetivo) ? <Outlet /> : <AcessoRestrito />}
        </main>
      </div>
      <MobileDrawer />
      <Toaster />
    </div>
  );
}
