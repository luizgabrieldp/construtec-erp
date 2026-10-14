import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { CadastroPage } from '@/pages/CadastroPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ObrasPage } from '@/pages/ObrasPage';
import { EquipePage } from '@/pages/EquipePage';
import { FolhaPage } from '@/pages/FolhaPage';
import { TarefasPage } from '@/pages/TarefasPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { RelatorioTecnicoPage } from '@/pages/RelatorioTecnicoPage';
import { useThemeEffect } from '@/hooks';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroPage /> },
  { path: '/relatorio-tecnico', element: <RelatorioTecnicoPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'tarefas', element: <TarefasPage /> },
      { path: 'obras', element: <ObrasPage /> },
      { path: 'equipe', element: <EquipePage /> },
      { path: 'folha', element: <FolhaPage /> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  useThemeEffect();
  return <RouterProvider router={router} />;
}
