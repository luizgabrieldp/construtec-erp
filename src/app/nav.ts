import {
  Building2,
  ClipboardCheck,
  CheckSquare,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Construction,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import type { Perfil } from '@/domain/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  perfis: Perfil[];
  /** tecla do atalho Alt + tecla */
  key: string;
  group: 'operacao' | 'financeiro' | 'sistema';
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perfis: ['admin', 'encarregado'], key: '1', group: 'operacao' },
  { to: '/obras', label: 'Obras', icon: Building2, perfis: ['admin', 'encarregado'], key: '2', group: 'operacao' },
  { to: '/equipe', label: 'Equipe & Presença', icon: ClipboardCheck, perfis: ['admin', 'encarregado'], key: '3', group: 'operacao' },
  { to: '/tarefas', label: 'Tarefas & Lembretes', icon: CheckSquare, perfis: ['admin', 'encarregado'], key: '5', group: 'operacao' },
  { to: '/folha', label: 'Folha de Pagamento', icon: Users, perfis: ['admin'], key: '4', group: 'financeiro' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, perfis: ['admin', 'encarregado'], key: '6', group: 'sistema' },
];

export const NAV_GROUPS: Record<NavItem['group'], string> = {
  operacao: 'Operação & Canteiro',
  financeiro: 'Folha & Remuneração',
  sistema: 'Sistema',
};

export const navDoPerfil = (perfil: Perfil) => NAV.filter((n) => n.perfis.includes(perfil));

export function podeAcessar(path: string, perfil: Perfil) {
  const item = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? path === '/' : path.startsWith(n.to)));
  return !item || item.perfis.includes(perfil);
}
