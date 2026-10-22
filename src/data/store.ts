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
  registrarMutacaoErp,
} from './sync';
import { useUi } from './ui';
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
  const chavesRecExistentes = new Set(
    data.contasPagar
      .filter((c) => c.origem === 'recorrencia' && c.origemId && c.vencimento)
      .map((c) => `${c.origemId}|${c.vencimento}`),
  );

  const novasFiltradas = novas.filter(
    (c) => !idsExistentes.has(c.id) && !chavesRecExistentes.has(`${c.origemId}|${c.vencimento}`),
  );

  const atualizado: ErpData = {
    ...data,
    recorrencias,
    contasPagar: [...data.contasPagar, ...novasFiltradas],
  };

  return registrarMutacaoErp(data, atualizado, repository.getClientId());
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
  return { id: uid('au'), ts: new Date().toISOString(), perfil: useUi.getState().perfil, ...info };
}

export const useErp = create<ErpState>()((set, get) => ({
  data: carregarInicial(),

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
    const agora = Date.now();
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
    repository.save(demo);
    set({ data: demo });
  },

  zerarSistema: () => {
    const agora = Date.now();
    const vazio = dadosVazios();
    vazio.audit = [entradaAuditoria({ acao: 'Sistema', descricao: 'Sistema zerado' })];
    vazio._meta = {
      updatedAt: {},
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

// Tempo real entre dispositivos (Firestore) e entre abas locais: mescla o estado sem perder alterações em memória.
repository.subscribe(() => {
  const externo = repository.load();
  if (!externo) return;
  const atual = useErp.getState().data;
  const mesclado = sincronizarRecorrencias(mesclarDadosErp(atual, externo));
  if (fingerprintDominio(atual) !== fingerprintDominio(mesclado) || atual.audit.length !== mesclado.audit.length) {
    useErp.setState({ data: mesclado });
  }
});

/** Atalho para ler a fatia de dados. */
export const useData = () => useErp((s) => s.data);
