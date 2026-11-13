import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useThemeEffect } from '@/hooks';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('@/pages/CadastroPage').then((m) => ({ default: m.CadastroPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ObrasPage = lazy(() => import('@/pages/ObrasPage').then((m) => ({ default: m.ObrasPage })));
const EquipePage = lazy(() => import('@/pages/EquipePage').then((m) => ({ default: m.EquipePage })));
const FolhaPage = lazy(() => import('@/pages/FolhaPage').then((m) => ({ default: m.FolhaPage })));
const TarefasPage = lazy(() => import('@/pages/TarefasPage').then((m) => ({ default: m.TarefasPage })));
const ConfiguracoesPage = lazy(() => import('@/pages/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })));

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-[var(--fg-muted)]">
          Carregando módulo...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <PageSuspense><LoginPage /></PageSuspense> },
  { path: '/cadastro', element: <PageSuspense><CadastroPage /></PageSuspense> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <PageSuspense><DashboardPage /></PageSuspense> },
      { path: 'tarefas', element: <PageSuspense><TarefasPage /></PageSuspense> },
      { path: 'obras', element: <PageSuspense><ObrasPage /></PageSuspense> },
      { path: 'equipe', element: <PageSuspense><EquipePage /></PageSuspense> },
      { path: 'folha', element: <PageSuspense><FolhaPage /></PageSuspense> },
      { path: 'configuracoes', element: <PageSuspense><ConfiguracoesPage /></PageSuspense> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  useThemeEffect();
  return <RouterProvider router={router} />;
}
