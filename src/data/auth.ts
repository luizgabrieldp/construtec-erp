import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Perfil } from '@/domain/types';
import { useUi } from './ui';
import { uid } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { canonicalizarJson } from './sync';

export interface Usuario {
  id: string;
  nome: string;
  emailOuLogin: string;
  senha: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: number;
}

export interface ConviteAcesso {
  id: string;
  codigo: string;
  perfil: Perfil;
  usado: boolean;
  usadoPor?: string;
  criadoEm: string;
  atualizadoEm?: number;
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
const AUTH_BACKUP_REF = doc(db, 'erp', 'auth_backup');

export function mesclarUsuarios(
  local: Usuario[],
  remoto: Usuario[],
  usuarioAtual?: Usuario | null,
): Usuario[] {
  const padraoMap = new Map(USUARIOS_PADRAO.map((u) => [u.id, u]));
  const map = new Map<string, Usuario>();

  const todos = [
    ...USUARIOS_PADRAO,
    ...(usuarioAtual ? [usuarioAtual] : []),
    ...(Array.isArray(local) ? local : []),
    ...(Array.isArray(remoto) ? remoto : []),
  ];

  for (const item of todos) {
    if (!item || typeof item.id !== 'string') continue;
    const existente = map.get(item.id);
    if (!existente) {
      map.set(item.id, { ...item });
      continue;
    }

    const tsExistente = existente.atualizadoEm ?? 0;
    const tsNovo = item.atualizadoEm ?? 0;

    if (tsNovo > tsExistente) {
      map.set(item.id, { ...item });
    } else if (tsExistente > tsNovo) {
      // mantém existente
    } else {
      // Se um deles foi customizado em relação ao padrão, prefere o customizado
      const padrao = padraoMap.get(item.id);
      const jsonExistente = canonicalizarJson(existente);
      const jsonNovo = canonicalizarJson(item);
      const jsonPadrao = padrao ? canonicalizarJson(padrao) : '';

      if (padrao && jsonExistente === jsonPadrao) {
        map.set(item.id, { ...item });
      } else if (padrao && jsonNovo === jsonPadrao) {
        // mantém existente customizado
      } else if (existente.ativo !== item.ativo && !padrao) {
        // Prefere o estado explícito mais recente ou determinístico
        map.set(item.id, jsonNovo >= jsonExistente ? { ...item } : existente);
      } else {
        map.set(item.id, jsonNovo >= jsonExistente ? { ...item } : existente);
      }
    }
  }

  return Array.from(map.values());
}

export function mesclarConvites(
  local: ConviteAcesso[],
  remoto: ConviteAcesso[],
): ConviteAcesso[] {
  const map = new Map<string, ConviteAcesso>();

  const todos = [
    ...CONVITES_PADRAO,
    ...(Array.isArray(local) ? local : []),
    ...(Array.isArray(remoto) ? remoto : []),
  ];

  for (const item of todos) {
    if (!item || typeof item.id !== 'string' || typeof item.codigo !== 'string') continue;
    const chave = item.codigo.trim().toUpperCase();
    const existente = map.get(chave);
    if (!existente) {
      map.set(chave, { ...item });
      continue;
    }

    const usado = Boolean(existente.usado || item.usado);
    const usadoPor = existente.usadoPor || item.usadoPor;
    const tsExistente = existente.atualizadoEm ?? 0;
    const tsNovo = item.atualizadoEm ?? 0;
    const base =
      tsNovo > tsExistente
        ? item
        : tsExistente > tsNovo
        ? existente
        : canonicalizarJson(item) >= canonicalizarJson(existente)
        ? item
        : existente;

    map.set(chave, {
      ...base,
      usado,
      ...(usadoPor ? { usadoPor } : {}),
      atualizadoEm: Math.max(tsExistente, tsNovo),
    });
  }

  return Array.from(map.values());
}

export function obterMaiorTimestampAuth(
  usuarios: Usuario[],
  convites: ConviteAcesso[],
  usuarioAtual?: Usuario | null,
): number {
  let maior = 0;
  if (
    usuarioAtual &&
    typeof usuarioAtual.atualizadoEm === 'number' &&
    Number.isFinite(usuarioAtual.atualizadoEm) &&
    usuarioAtual.atualizadoEm > maior
  ) {
    maior = usuarioAtual.atualizadoEm;
  }
  if (Array.isArray(usuarios)) {
    for (const u of usuarios) {
      if (u && typeof u.atualizadoEm === 'number' && Number.isFinite(u.atualizadoEm) && u.atualizadoEm > maior) {
        maior = u.atualizadoEm;
      }
    }
  }
  if (Array.isArray(convites)) {
    for (const c of convites) {
      if (c && typeof c.atualizadoEm === 'number' && Number.isFinite(c.atualizadoEm) && c.atualizadoEm > maior) {
        maior = c.atualizadoEm;
      }
    }
  }
  return maior;
}

function fingerprintAuth(usuarios: Usuario[], convites: ConviteAcesso[]): string {
  const uOrd = [...usuarios].sort((a, b) => a.id.localeCompare(b.id));
  const cOrd = [...convites].sort((a, b) => a.codigo.localeCompare(b.codigo));
  return canonicalizarJson({ usuarios: uOrd, convites: cOrd });
}

async function sincronizarAuthNuvem(
  usuariosLocais: Usuario[],
  convitesLocais: ConviteAcesso[],
  usuarioAtual?: Usuario | null,
) {
  try {
    let usuariosFinais = mesclarUsuarios(usuariosLocais, [], usuarioAtual);
    let convitesFinais = mesclarConvites(convitesLocais, []);
    let fpNuvem = '';

    try {
      const snap = await getDoc(AUTH_DOC_REF);
      if (snap.exists()) {
        const d = snap.data();
        const nuvemU = Array.isArray(d?.usuarios) ? (d.usuarios as Usuario[]) : [];
        const nuvemC = Array.isArray(d?.convites) ? (d.convites as ConviteAcesso[]) : [];
        fpNuvem = fingerprintAuth(nuvemU, nuvemC);
        usuariosFinais = mesclarUsuarios(usuariosFinais, nuvemU, usuarioAtual);
        convitesFinais = mesclarConvites(convitesFinais, nuvemC);
      }
    } catch {}

    const s = useAuth.getState();
    const usuarioAtualSincronizado = s.usuarioAtual
      ? usuariosFinais.find((u) => u.id === s.usuarioAtual!.id) ?? s.usuarioAtual
      : null;

    if (
      fingerprintAuth(s.usuarios, s.convites) !== fingerprintAuth(usuariosFinais, convitesFinais) ||
      canonicalizarJson(s.usuarioAtual) !== canonicalizarJson(usuarioAtualSincronizado)
    ) {
      useAuth.setState({
        usuarios: usuariosFinais,
        convites: convitesFinais,
        usuarioAtual:
          usuarioAtualSincronizado && usuarioAtualSincronizado.ativo === false
            ? null
            : usuarioAtualSincronizado,
      });
      if (usuarioAtualSincronizado && usuarioAtualSincronizado.ativo !== false) {
        useUi.getState().setPerfil(usuarioAtualSincronizado.perfil);
      }
    }

    if (fingerprintAuth(usuariosFinais, convitesFinais) !== fpNuvem) {
      const payload = {
        usuarios: JSON.parse(JSON.stringify(usuariosFinais)),
        convites: JSON.parse(JSON.stringify(convitesFinais)),
      };

      await setDoc(AUTH_DOC_REF, payload);
      setDoc(AUTH_BACKUP_REF, payload).catch(() => {});
    }
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

        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, atual) + 1,
        );

        const atualizado: Usuario = {
          ...atual,
          nome: dados.nome?.trim() || atual.nome,
          emailOuLogin: dados.emailOuLogin?.trim() || atual.emailOuLogin,
          senha: dados.senha?.trim() || atual.senha,
          atualizadoEm: agora,
        };

        const existeNaLista = get().usuarios.some((u) => u.id === atual.id);
        const novaLista = existeNaLista
          ? get().usuarios.map((u) => (u.id === atual.id ? atualizado : u))
          : [...get().usuarios, atualizado];

        set({
          usuarioAtual: atualizado,
          usuarios: novaLista,
        });

        void sincronizarAuthNuvem(novaLista, get().convites, atualizado);
      },

      criarConvite: (perfil) => {
        const aleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();
        const prefixo = perfil === 'admin' ? 'ADM' : 'OBRA';
        const codigo = `${prefixo}-${aleatorio}`;
        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, get().usuarioAtual) + 1,
        );

        const novoConvite: ConviteAcesso = {
          id: uid('inv'),
          codigo,
          perfil,
          usado: false,
          criadoEm: new Date(agora).toISOString(),
          atualizadoEm: agora,
        };

        const novosConvites = [novoConvite, ...get().convites];
        set({ convites: novosConvites });

        void sincronizarAuthNuvem(get().usuarios, novosConvites, get().usuarioAtual);
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

        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, get().usuarioAtual) + 1,
        );
        const novoUsuario: Usuario = {
          id: uid('usr'),
          nome: dados.nome.trim(),
          emailOuLogin: dados.emailOuLogin.trim(),
          senha: dados.senha.trim(),
          perfil: convite.perfil,
          ativo: true,
          criadoEm: new Date(agora).toISOString(),
          atualizadoEm: agora,
        };

        const novosUsuarios = [...get().usuarios, novoUsuario];
        const novosConvites = get().convites.map((c) =>
          c.id === convite.id
            ? { ...c, usado: true, usadoPor: novoUsuario.nome, atualizadoEm: agora }
            : c
        );

        set({
          usuarios: novosUsuarios,
          convites: novosConvites,
          usuarioAtual: novoUsuario,
        });

        useUi.getState().setPerfil(novoUsuario.perfil);
        void sincronizarAuthNuvem(novosUsuarios, novosConvites, novoUsuario);
        return { ok: true };
      },

      alternarStatusUsuario: (usuarioId) => {
        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, get().usuarioAtual) + 1,
        );
        const novosUsuarios = get().usuarios.map((u) =>
          u.id === usuarioId ? { ...u, ativo: !u.ativo, atualizadoEm: agora } : u
        );
        const atual = get().usuarioAtual;
        const novoUsuarioAtual =
          atual && atual.id === usuarioId
            ? novosUsuarios.find((u) => u.id === usuarioId) ?? atual
            : atual;
        set({ usuarios: novosUsuarios, usuarioAtual: novoUsuarioAtual });
        void sincronizarAuthNuvem(novosUsuarios, get().convites, novoUsuarioAtual);
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

// Listener do Cloud Firestore para sincronização em tempo real de usuários e convites (com mesclagem segura)
try {
  onSnapshot(
    AUTH_DOC_REF,
    (snap) => {
      const s = useAuth.getState();

      if (snap.exists()) {
        const data = snap.data();
        const nuvemU = Array.isArray(data?.usuarios) ? (data.usuarios as Usuario[]) : [];
        const nuvemC = Array.isArray(data?.convites) ? (data.convites as ConviteAcesso[]) : [];

        const usuariosMesclados = mesclarUsuarios(s.usuarios, nuvemU, s.usuarioAtual);
        const convitesMesclados = mesclarConvites(s.convites, nuvemC);

        const usuarioAtualSincronizado = s.usuarioAtual
          ? usuariosMesclados.find((u) => u.id === s.usuarioAtual!.id) ?? s.usuarioAtual
          : null;

        const fpLocal = fingerprintAuth(s.usuarios, s.convites);
        const fpMesclado = fingerprintAuth(usuariosMesclados, convitesMesclados);
        const fpNuvem = fingerprintAuth(nuvemU, nuvemC);

        if (
          fpMesclado !== fpLocal ||
          canonicalizarJson(s.usuarioAtual) !== canonicalizarJson(usuarioAtualSincronizado)
        ) {
          useAuth.setState({
            usuarios: usuariosMesclados,
            convites: convitesMesclados,
            usuarioAtual: usuarioAtualSincronizado,
          });
          if (usuarioAtualSincronizado && usuarioAtualSincronizado.ativo === false) {
            useAuth.setState({ usuarioAtual: null });
          } else if (usuarioAtualSincronizado) {
            useUi.getState().setPerfil(usuarioAtualSincronizado.perfil);
          }
        }

        // Se o aparelho local tinha usuário cadastrado ou convite que faltava na nuvem, resgata para a nuvem
        if (fpMesclado !== fpNuvem) {
          void sincronizarAuthNuvem(usuariosMesclados, convitesMesclados, usuarioAtualSincronizado);
        }
      } else {
        void sincronizarAuthNuvem(s.usuarios, s.convites, s.usuarioAtual);
      }
    },
    () => {}
  );

  if (typeof window !== 'undefined') {
    const resincronizarAuthAoFocar = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const s = useAuth.getState();
      void sincronizarAuthNuvem(s.usuarios, s.convites, s.usuarioAtual);
    };
    window.addEventListener('online', resincronizarAuthAoFocar);
    window.addEventListener('focus', resincronizarAuthAoFocar);
    window.addEventListener('pageshow', resincronizarAuthAoFocar);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', resincronizarAuthAoFocar);
    }
  }
} catch {}
