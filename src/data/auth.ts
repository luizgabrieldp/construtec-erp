import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Perfil } from '@/domain/types';
import { useUi } from './ui';
import { uid } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface Usuario {
  id: string;
  nome: string;
  emailOuLogin: string;
  senha: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
}

export interface ConviteAcesso {
  id: string;
  codigo: string;
  perfil: Perfil;
  usado: boolean;
  usadoPor?: string;
  criadoEm: string;
}

const USUARIOS_PADRAO: Usuario[] = [
  {
    id: 'usr-admin',
    nome: 'Administrador Construtec',
    emailOuLogin: 'admin',
    senha: 'admin123',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-encarregado',
    nome: 'Encarregado da Obra',
    emailOuLogin: 'encarregado',
    senha: 'obra123',
    perfil: 'encarregado',
    ativo: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  },
];

const CONVITES_PADRAO: ConviteAcesso[] = [
  {
    id: 'inv-obra-demo',
    codigo: 'OBRA2026',
    perfil: 'encarregado',
    usado: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'inv-admin-demo',
    codigo: 'ADMIN2026',
    perfil: 'admin',
    usado: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
  },
];

const AUTH_DOC_REF = doc(db, 'erp', 'auth');

function sincronizarAuthNuvem(usuarios: Usuario[], convites: ConviteAcesso[]) {
  try {
    setDoc(AUTH_DOC_REF, {
      usuarios: JSON.parse(JSON.stringify(usuarios)),
      convites: JSON.parse(JSON.stringify(convites)),
    }).catch(() => {});
  } catch {}
}

interface AuthState {
  usuarioAtual: Usuario | null;
  usuarios: Usuario[];
  convites: ConviteAcesso[];

  login: (loginOuEmail: string, senha: string) => { ok: boolean; error?: string };
  loginRapido: (perfil: Perfil) => boolean;
  logout: () => void;
  atualizarPerfil: (dados: { nome?: string; emailOuLogin?: string; senha?: string }) => void;
  criarConvite: (perfil: Perfil) => ConviteAcesso;
  validarConvite: (codigo: string) => ConviteAcesso | null;
  cadastrarComConvite: (
    codigo: string,
    dados: { nome: string; emailOuLogin: string; senha: string }
  ) => { ok: boolean; error?: string };
  alternarStatusUsuario: (usuarioId: string) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      usuarioAtual: null,
      usuarios: USUARIOS_PADRAO,
      convites: CONVITES_PADRAO,

      login: (loginOuEmail, senha) => {
        const cleanLogin = loginOuEmail.trim().toLowerCase();
        const cleanSenha = senha.trim();

        const usuario = get().usuarios.find(
          (u) => u.emailOuLogin.toLowerCase() === cleanLogin && u.senha === cleanSenha
        );

        if (!usuario) {
          return { ok: false, error: 'Credenciais inválidas. Verifique o login/e-mail e senha.' };
        }

        if (!usuario.ativo) {
          return { ok: false, error: 'Este usuário está inativo. Contate o administrador.' };
        }

        set({ usuarioAtual: usuario });
        useUi.getState().setPerfil(usuario.perfil);
        return { ok: true };
      },

      loginRapido: (perfil) => {
        let usuario = get().usuarios.find((u) => u.perfil === perfil && u.ativo);
        if (!usuario) {
          usuario = USUARIOS_PADRAO.find((u) => u.perfil === perfil);
        }
        if (!usuario) return false;

        set({ usuarioAtual: usuario });
        useUi.getState().setPerfil(usuario.perfil);
        return true;
      },

      logout: () => {
        set({ usuarioAtual: null });
      },

      atualizarPerfil: (dados) => {
        const atual = get().usuarioAtual;
        if (!atual) return;

        const atualizado: Usuario = {
          ...atual,
          nome: dados.nome?.trim() || atual.nome,
          emailOuLogin: dados.emailOuLogin?.trim() || atual.emailOuLogin,
          senha: dados.senha?.trim() || atual.senha,
        };

        const novaLista = get().usuarios.map((u) => (u.id === atual.id ? atualizado : u));

        set({
          usuarioAtual: atualizado,
          usuarios: novaLista,
        });

        sincronizarAuthNuvem(novaLista, get().convites);
      },

      criarConvite: (perfil) => {
        const aleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();
        const prefixo = perfil === 'admin' ? 'ADM' : 'OBRA';
        const codigo = `${prefixo}-${aleatorio}`;

        const novoConvite: ConviteAcesso = {
          id: uid('inv'),
          codigo,
          perfil,
          usado: false,
          criadoEm: new Date().toISOString(),
        };

        const novosConvites = [novoConvite, ...get().convites];
        set({ convites: novosConvites });

        sincronizarAuthNuvem(get().usuarios, novosConvites);
        return novoConvite;
      },

      validarConvite: (codigo) => {
        const clean = codigo.trim().toUpperCase();
        return get().convites.find((c) => c.codigo.toUpperCase() === clean && !c.usado) || null;
      },

      cadastrarComConvite: (codigo, dados) => {
        const convite = get().validarConvite(codigo);
        if (!convite) {
          return { ok: false, error: 'Código de convite inválido ou já utilizado.' };
        }

        const loginJaExiste = get().usuarios.some(
          (u) => u.emailOuLogin.toLowerCase() === dados.emailOuLogin.trim().toLowerCase()
        );
        if (loginJaExiste) {
          return { ok: false, error: 'Este login/e-mail já está cadastrado no sistema.' };
        }

        const novoUsuario: Usuario = {
          id: uid('usr'),
          nome: dados.nome.trim(),
          emailOuLogin: dados.emailOuLogin.trim(),
          senha: dados.senha.trim(),
          perfil: convite.perfil,
          ativo: true,
          criadoEm: new Date().toISOString(),
        };

        const novosUsuarios = [...get().usuarios, novoUsuario];
        const novosConvites = get().convites.map((c) =>
          c.id === convite.id ? { ...c, usado: true, usadoPor: novoUsuario.nome } : c
        );

        set({
          usuarios: novosUsuarios,
          convites: novosConvites,
          usuarioAtual: novoUsuario,
        });

        useUi.getState().setPerfil(novoUsuario.perfil);
        sincronizarAuthNuvem(novosUsuarios, novosConvites);
        return { ok: true };
      },

      alternarStatusUsuario: (usuarioId) => {
        const novosUsuarios = get().usuarios.map((u) =>
          u.id === usuarioId ? { ...u, ativo: !u.ativo } : u
        );
        set({ usuarios: novosUsuarios });
        sincronizarAuthNuvem(novosUsuarios, get().convites);
      },
    }),
    {
      name: 'construtec:auth',
      partialize: (s) => ({
        usuarioAtual: s.usuarioAtual,
        usuarios: s.usuarios,
        convites: s.convites,
      }),
    }
  )
);

// Listener do Cloud Firestore para sincronização em tempo real de usuários e convites
try {
  onSnapshot(
    AUTH_DOC_REF,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.usuarios) && data.usuarios.length > 0) {
          useAuth.setState((s) => ({
            usuarios: data.usuarios,
            convites: Array.isArray(data.convites) ? data.convites : s.convites,
          }));
        }
      } else {
        sincronizarAuthNuvem(USUARIOS_PADRAO, CONVITES_PADRAO);
      }
    },
    () => {}
  );
} catch {}
