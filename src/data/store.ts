import { create } from 'zustand';
import type { AuditEntry, Config, ErpData } from '@/domain/types';
import { dadosVazios, gerarDadosDemo } from '@/domain/mock';
import { gerarContasRecorrentes } from '@/domain/engine';
import { repository } from './repository';
import {
  COLECOES_ARRAY,
  fingerprintDominio,
  mesclarDadosErp,
  normalizarDadosErp,
  obterMaiorTimestampConhecido,
  registrarMutacaoErp,
} from './sync';
import { useAuth } from './auth';
import { today } from '@/lib/dates';
import { uid } from '@/lib/utils';

interface AuditInfo {
  acao: string;
  descricao: string;
}

interface ErpState {
  data: ErpData;
  /**
   * Única porta de escrita: recebe um rascunho clonado, aplica a mutação,
   * grava no repositório e registra auditoria. Componentes nunca escrevem direto.
   */
  mutate: (fn: (draft: ErpData) => void, audit?: AuditInfo) => void;
  restaurarDemo: () => void;
  zerarSistema: () => void;
  atualizarConfig: (patch: Partial<Config>) => void;
}

/** Gera automaticamente as contas recorrentes do mês corrente (idempotente). */
function sincronizarRecorrencias(data: ErpData): ErpData {
  const { novas, recorrencias } = gerarContasRecorrentes(data.recorrencias, today());
  if (!novas.length) return data;

  const idsExistentes = new Set(data.contasPagar.map((c) => c.id));
  const deletedIds = data._meta?.deletedIds || {};
  const chavesRecExistentes = new Set(
    data.contasPagar
      .filter((c) => c.origem === 'recorrencia' && c.origemId && c.vencimento)
      .map((c) => `${c.origemId}|${c.vencimento}`),
  );

  const novasFiltradas = novas.filter(
    (c) =>
      !idsExistentes.has(c.id) &&
      !deletedIds[`contasPagar:${c.id}`] &&
      !chavesRecExistentes.has(`${c.origemId}|${c.vencimento}`),
  );

  if (!novasFiltradas.length && fingerprintDominio({ ...data, recorrencias }) === fingerprintDominio(data)) {
    return data;
  }

  const atualizado: ErpData = {
    ...data,
    recorrencias,
    contasPagar: [...data.contasPagar, ...novasFiltradas],
  };

  // Usa timestamp base (1) para geração automática de recorrência a fim de nunca sobrescrever
  // uma baixa/pagamento manual ('pago') feita em outro dispositivo.
  return registrarMutacaoErp(data, atualizado, repository.getClientId(), 1);
}

/**
 * Carrega o estado inicial a partir do armazenamento local.
 * IMPORTANTE: Quando não há dados locais (novo navegador, novo celular ou PWA recém-instalado),
 * retorna `dadosVazios()` apenas em memória — JAMAIS chama `repository.save(vazio)`,
 * impedindo que um dispositivo novo sobrescreva o banco na nuvem.
 */
function carregarInicial(): ErpData {
  const salvo = repository.load();
  if (salvo) {
    const normalizado = normalizarDadosErp(salvo);
    if (normalizado) {
      return sincronizarRecorrencias(normalizado);
    }
  }
  return dadosVazios();
}

function entradaAuditoria(info: AuditInfo): AuditEntry {
  const usuario = useAuth.getState().usuarioAtual;
  const autor = usuario ? `${usuario.nome} (${usuario.perfil})` : 'sistema';
  return {
    id: uid('au'),
    ts: new Date().toISOString(),
    perfil: usuario?.perfil ?? 'encarregado',
    acao: info.acao,
    descricao: `${info.descricao} [${autor}]`,
  };
}

export const useErp = create<ErpState>()((set, get) => ({
  data: useAuth.getState().usuarioAtual ? carregarInicial() : dadosVazios(),

  mutate: (fn, audit) => {
    const prev = get().data;
    const draft = structuredClone(prev);
    fn(draft);
    if (audit) draft.audit = [entradaAuditoria(audit), ...draft.audit].slice(0, 500);
    registrarMutacaoErp(prev, draft, repository.getClientId());
    repository.save(draft);
    const consolidado = repository.load() ?? draft;
    set({ data: consolidado });
  },

  restaurarDemo: () => {
    const agora = Math.max(Date.now(), obterMaiorTimestampConhecido(get().data) + 1);
    const demo = normalizarDadosErp(gerarDadosDemo())!;
    const updatedAt: Record<string, number> = { config: agora };
    for (const col of COLECOES_ARRAY) {
      for (const item of demo[col] as { id: string }[]) {
        updatedAt[`${col}:${item.id}`] = agora;
      }
    }
    for (const k of Object.keys(demo.apontamentos)) {
      updatedAt[`apontamentos:${k}`] = agora;
    }
    demo._meta = {
      updatedAt,
      deletedIds: {},
      lastClientId: repository.getClientId(),
      lastWriteAt: agora,
    };
    repository.save(demo, { forceReset: true });
    set({ data: demo });
  },

  zerarSistema: () => {
    const agora = Math.max(Date.now(), obterMaiorTimestampConhecido(get().data) + 1);
    const vazio = dadosVazios();
    vazio.audit = [entradaAuditoria({ acao: 'Sistema', descricao: 'Sistema zerado' })];
    vazio._meta = {
      updatedAt: { config: agora },
      deletedIds: {},
      systemResetAt: agora,
      lastClientId: repository.getClientId(),
      lastWriteAt: agora,
    };
    repository.save(vazio, { forceReset: true });
    set({ data: vazio });
  },

  atualizarConfig: (patch) =>
    get().mutate(
      (d) => {
        d.config = { ...d.config, ...patch };
      },
      { acao: 'Configurações', descricao: 'Atualizou configurações gerais' },
    ),
}));

let unsubscribeErpSync: (() => void) | null = null;

/** Inicia sincronização em tempo real do ERP somente após haver sessão autenticada. */
export function iniciarSyncErp(): void {
  if (unsubscribeErpSync || !useAuth.getState().usuarioAtual) return;

  const inicial = carregarInicial();
  const atual = useErp.getState().data;
  if (
    fingerprintDominio(atual) !== fingerprintDominio(inicial) ||
    obterMaiorTimestampConhecido(inicial) > obterMaiorTimestampConhecido(atual)
  ) {
    useErp.setState({ data: inicial });
  }

  // Tempo real entre dispositivos (Firestore) e entre abas locais: mescla o estado sem perder alterações em memória.
  unsubscribeErpSync = repository.subscribe(() => {
    if (!useAuth.getState().usuarioAtual) return;
    const externo = repository.load();
    if (!externo) return;
    const estadoAtual = useErp.getState().data;
    const mesclado = sincronizarRecorrencias(mesclarDadosErp(estadoAtual, externo));
    if (
      fingerprintDominio(estadoAtual) !== fingerprintDominio(mesclado) ||
      estadoAtual.audit.length !== mesclado.audit.length ||
      obterMaiorTimestampConhecido(mesclado) > obterMaiorTimestampConhecido(estadoAtual)
    ) {
      useErp.setState({ data: mesclado });
    }
  });
}

/** Encerra listeners e limpa estado em memória ao sair da sessão. */
export function pararSyncErp(): void {
  if (unsubscribeErpSync) {
    unsubscribeErpSync();
    unsubscribeErpSync = null;
  }
  repository.clear();
  useErp.setState({ data: dadosVazios() });
}

if (useAuth.getState().usuarioAtual) {
  iniciarSyncErp();
}

useAuth.subscribe((state, prevState) => {
  const logadoAntes = Boolean(prevState.usuarioAtual);
  const logadoAgora = Boolean(state.usuarioAtual);
  if (!logadoAntes && logadoAgora) {
    iniciarSyncErp();
  } else if (logadoAntes && !logadoAgora) {
    pararSyncErp();
  }
});

/** Atalho para ler a fatia de dados. */
export const useData = () => useErp((s) => s.data);
