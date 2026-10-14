import { create } from 'zustand';
import type { AuditEntry, Config, ErpData } from '@/domain/types';
import { DATA_VERSION, dadosVazios, gerarDadosDemo } from '@/domain/mock';
import { gerarContasRecorrentes } from '@/domain/engine';
import { repository } from './repository';
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
  return { ...data, recorrencias, contasPagar: [...data.contasPagar, ...novas] };
}

function carregarInicial(): ErpData {
  const salvo = repository.load();
  if (salvo && salvo.version === DATA_VERSION) {
    salvo.servicos ??= [];
    salvo.tarefas ??= [];
    salvo.funcoesCustomizadas ??= [];
    return sincronizarRecorrencias(salvo);
  }
  const demo = gerarDadosDemo();
  repository.save(demo);
  return demo;
}

function entradaAuditoria(info: AuditInfo): AuditEntry {
  return { id: uid('au'), ts: new Date().toISOString(), perfil: useUi.getState().perfil, ...info };
}

export const useErp = create<ErpState>()((set, get) => ({
  data: carregarInicial(),

  mutate: (fn, audit) => {
    const draft = structuredClone(get().data);
    fn(draft);
    if (audit) draft.audit = [entradaAuditoria(audit), ...draft.audit].slice(0, 500);
    repository.save(draft);
    set({ data: draft });
  },

  restaurarDemo: () => {
    const demo = gerarDadosDemo();
    repository.save(demo);
    set({ data: demo });
  },

  zerarSistema: () => {
    const vazio = dadosVazios();
    vazio.audit = [entradaAuditoria({ acao: 'Sistema', descricao: 'Sistema zerado' })];
    repository.save(vazio);
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

// Tempo real entre abas: quando outra aba grava, recarrega o estado aqui (ex.: Modo TV).
repository.subscribe(() => {
  const externo = repository.load();
  if (externo) useErp.setState({ data: externo });
});

/** Atalho para ler a fatia de dados. */
export const useData = () => useErp((s) => s.data);
