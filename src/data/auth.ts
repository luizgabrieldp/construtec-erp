import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Perfil } from '@/domain/types';
import { useUi } from './ui';
import { uid } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocFromServer, setDoc, onSnapshot } from 'firebase/firestore';
import { canonicalizarJson } from './sync';
import { gerarCodigoSeguro, hashPassword, verifyPassword } from '@/lib/crypto';

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

const IS_PROD = Boolean(import.meta.env?.PROD);
const IS_DEV = Boolean(import.meta.env?.DEV);

export const USUARIOS_PADRAO: Usuario[] = [
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

function limparStorageSensivel(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const paraRemover = new Set<string>([
      'construtec:data',
      'construtec:data:backup',
      'construtec:data:vault',
      'construtec:auth',
    ]);
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('construtec:data:') || k.startsWith('construtec:erp:'))) {
        paraRemover.add(k);
      }
    }
    for (const k of paraRemover) {
      localStorage.removeItem(k);
    }
  } catch {}
}

export function mesclarUsuarios(
  local: Usuario[],
  remoto: Usuario[],
  usuarioAtual?: Usuario | null,
): Usuario[] {
  const seed = IS_PROD ? [] : USUARIOS_PADRAO;
  const padraoMap = new Map(seed.map((u) => [u.id, u]));
  const map = new Map<string, Usuario>();

  const todos = [
    ...seed,
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
  const seed = IS_PROD ? [] : CONVITES_PADRAO;

  const todos = [
    ...seed,
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
      let snap;
      try {
        snap = await getDocFromServer(AUTH_DOC_REF);
      } catch (serverErr) {
        const code = (serverErr as { code?: string })?.code ?? '';
        const msg = serverErr instanceof Error ? serverErr.message.toLowerCase() : '';
        const isNetworkError =
          code === 'unavailable' ||
          code === 'deadline-exceeded' ||
          msg.includes('offline') ||
          msg.includes('network') ||
          (typeof navigator !== 'undefined' && navigator.onLine === false);
        if (!isNetworkError) throw serverErr;
        snap = await getDoc(AUTH_DOC_REF);
      }
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

export type AuthActionResult = { ok: boolean; error?: string };
export type CriarConviteResult =
  | { ok: true; convite: ConviteAcesso }
  | { ok: false; error: string };

interface AuthState {
  usuarioAtual: Usuario | null;
  usuarios: Usuario[];
  convites: ConviteAcesso[];

  login: (loginOuEmail: string, senha: string) => Promise<AuthActionResult>;
  loginRapido: (perfil: Perfil) => AuthActionResult;
  logout: () => void;
  atualizarPerfil: (dados: { nome?: string; emailOuLogin?: string; senha?: string }) => Promise<AuthActionResult>;
  criarConvite: (perfil: Perfil) => CriarConviteResult;
  validarConvite: (codigo: string) => ConviteAcesso | null;
  cadastrarComConvite: (
    codigo: string,
    dados: { nome: string; emailOuLogin: string; senha: string }
  ) => Promise<AuthActionResult>;
  alternarStatusUsuario: (usuarioId: string) => AuthActionResult;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      usuarioAtual: null,
      usuarios: IS_PROD ? [] : USUARIOS_PADRAO,
      convites: IS_PROD ? [] : CONVITES_PADRAO,

      login: async (loginOuEmail, senha) => {
        const cleanLogin = loginOuEmail.trim().toLowerCase();
        const cleanSenha = senha.trim();

        const candidatos = get().usuarios.filter((u) => u.emailOuLogin.toLowerCase() === cleanLogin);
        let usuario: Usuario | null = null;
        let precisaMigrar = false;

        for (const cand of candidatos) {
          const check = await verifyPassword(cleanSenha, cand.senha);
          if (check.valid) {
            usuario = cand;
            precisaMigrar = check.needsMigration;
            break;
          }
        }

        if (!usuario) {
          return { ok: false, error: 'Credenciais inválidas. Verifique o login/e-mail e senha.' };
        }

        if (!usuario.ativo) {
          return { ok: false, error: 'Este usuário está inativo. Contate o administrador.' };
        }

        let usuarioFinal = usuario;
        if (precisaMigrar) {
          const hashed = await hashPassword(cleanSenha);
          const agora = Math.max(
            Date.now(),
            obterMaiorTimestampAuth(get().usuarios, get().convites, usuario) + 1,
          );
          usuarioFinal = { ...usuario, senha: hashed, atualizadoEm: agora };
          const novaLista = get().usuarios.map((u) => (u.id === usuario!.id ? usuarioFinal : u));
          set({ usuarios: novaLista, usuarioAtual: usuarioFinal });
          void sincronizarAuthNuvem(novaLista, get().convites, usuarioFinal);
        } else {
          set({ usuarioAtual: usuarioFinal });
        }

        useUi.getState().setPerfil(usuarioFinal.perfil);
        return { ok: true };
      },

      loginRapido: (perfil) => {
        if (!IS_DEV || IS_PROD) {
          return { ok: false, error: 'Acesso rápido disponível apenas em ambiente de desenvolvimento.' };
        }
        const usuario = get().usuarios.find((u) => u.perfil === perfil && u.ativo);
        if (!usuario) {
          return { ok: false, error: 'Nenhum usuário ativo encontrado para este perfil.' };
        }

        set({ usuarioAtual: usuario });
        useUi.getState().setPerfil(usuario.perfil);
        return { ok: true };
      },

      logout: () => {
        set({ usuarioAtual: null });
        useUi.getState().setPerfil('encarregado');
        limparStorageSensivel();
      },

      atualizarPerfil: async (dados) => {
        const atual = get().usuarioAtual;
        if (!atual) return { ok: false, error: 'Usuário não autenticado.' };

        const novoLogin = dados.emailOuLogin?.trim() || atual.emailOuLogin;
        const loginEmUso = get().usuarios.some(
          (u) => u.id !== atual.id && u.emailOuLogin.toLowerCase() === novoLogin.toLowerCase(),
        );
        if (loginEmUso) {
          return { ok: false, error: 'Este login/e-mail já está em uso por outro usuário.' };
        }

        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, atual) + 1,
        );

        const senhaLimpa = dados.senha?.trim();
        const novaSenha = senhaLimpa ? await hashPassword(senhaLimpa) : atual.senha;

        const atualizado: Usuario = {
          ...atual,
          nome: dados.nome?.trim() || atual.nome,
          emailOuLogin: novoLogin,
          senha: novaSenha,
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
        return { ok: true };
      },

      criarConvite: (perfil) => {
        const atual = get().usuarioAtual;
        if (!atual || atual.perfil !== 'admin') {
          return { ok: false, error: 'Apenas administradores podem gerar convites.' };
        }

        const prefixo = perfil === 'admin' ? 'ADM-' : 'OBRA-';
        const codigo = gerarCodigoSeguro(prefixo, 6);
        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, atual) + 1,
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

        void sincronizarAuthNuvem(get().usuarios, novosConvites, atual);
        return { ok: true, convite: novoConvite };
      },

      validarConvite: (codigo) => {
        const clean = codigo.trim().toUpperCase();
        return get().convites.find((c) => c.codigo.toUpperCase() === clean && !c.usado) || null;
      },

      cadastrarComConvite: async (codigo, dados) => {
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
        const senhaHash = await hashPassword(dados.senha.trim());
        const novoUsuario: Usuario = {
          id: uid('usr'),
          nome: dados.nome.trim(),
          emailOuLogin: dados.emailOuLogin.trim(),
          senha: senhaHash,
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
        const atual = get().usuarioAtual;
        if (!atual || atual.perfil !== 'admin') {
          return { ok: false, error: 'Apenas administradores podem alterar o status de usuários.' };
        }

        const agora = Math.max(
          Date.now(),
          obterMaiorTimestampAuth(get().usuarios, get().convites, atual) + 1,
        );
        const novosUsuarios = get().usuarios.map((u) =>
          u.id === usuarioId ? { ...u, ativo: !u.ativo, atualizadoEm: agora } : u
        );
        const novoUsuarioAtual =
          atual.id === usuarioId
            ? novosUsuarios.find((u) => u.id === usuarioId) ?? atual
            : atual;
        set({ usuarios: novosUsuarios, usuarioAtual: novoUsuarioAtual });
        void sincronizarAuthNuvem(novosUsuarios, get().convites, novoUsuarioAtual);
        return { ok: true };
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
            useUi.getState().setPerfil('encarregado');
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
