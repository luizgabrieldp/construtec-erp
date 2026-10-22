import type {
  Apontamento,
  AuditEntry,
  ContaPagar,
  ErpData,
  ErpSyncMeta,
} from '@/domain/types';
import { DATA_VERSION, dadosVazios } from '@/domain/mock';

export const COLECOES_ARRAY = [
  'obras',
  'fornecedores',
  'materiais',
  'compras',
  'movimentos',
  'locacoes',
  'funcionarios',
  'fechamentos',
  'servicos',
  'tarefas',
  'contasPagar',
  'contasReceber',
  'recorrencias',
] as const;

export type ColecaoIdKey = (typeof COLECOES_ARRAY)[number];

interface EntidadeComId {
  id: string;
  [key: string]: unknown;
}

/**
 * Serialização canônica determinística: ordena as chaves de objetos alfabeticamente,
 * ignora propriedades `undefined` e ignora `_meta`.
 * Isso garante que a reordenação de chaves pelo Firestore nunca gere falsos positivos de diff.
 */
export function canonicalizarJson(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val !== 'object') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + val.map((item) => canonicalizarJson(item)).join(',') + ']';
  }
  const obj = val as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => k !== '_meta' && obj[k] !== undefined)
    .sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalizarJson(obj[k])).join(',') +
    '}'
  );
}

export function igualCanonico(a: unknown, b: unknown): boolean {
  return canonicalizarJson(a) === canonicalizarJson(b);
}

/**
 * Conta a quantidade total de registros de domínio presentes em `data`.
 * Usado para detectar se um estado contém dados preenchidos pelos usuários
 * e impedir que um documento vazio apague dados reais.
 */
export function contarRegistrosErp(data: ErpData | null | undefined): number {
  if (!data || typeof data !== 'object') return 0;
  let total = 0;
  for (const col of COLECOES_ARRAY) {
    const arr = data[col];
    if (Array.isArray(arr)) total += arr.length;
  }
  if (data.apontamentos && typeof data.apontamentos === 'object') {
    total += Object.keys(data.apontamentos).length;
  }
  if (Array.isArray(data.funcoesCustomizadas)) {
    total += data.funcoesCustomizadas.length;
  }
  if (
    data.config &&
    ((typeof data.config.saldoInicial === 'number' && data.config.saldoInicial !== 0) ||
      (typeof data.config.empresa === 'string' &&
        data.config.empresa.trim() !== '' &&
        data.config.empresa !== 'CONSTRUTEC'))
  ) {
    total += 1;
  }
  return total;
}

/**
 * Verifica se o objeto `ErpData` possui estado intencional sincronizável
 * (registros ativos, exclusões intencionais em `deletedIds`, edições em `updatedAt` ou `systemResetAt`).
 * Retorna `false` apenas para um documento `dadosVazios()` recém-inicializado/em branco.
 */
export function possuiEstadoSincronizavelErp(data: ErpData | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (contarRegistrosErp(data) > 0) return true;
  if (typeof data._meta?.systemResetAt === 'number' && data._meta.systemResetAt > 0) return true;
  if (data._meta?.deletedIds && Object.keys(data._meta.deletedIds).length > 0) return true;
  if (data._meta?.updatedAt && Object.keys(data._meta.updatedAt).length > 0) return true;
  return false;
}

/**
 * Normaliza qualquer objeto `ErpData` (inclusive de versões anteriores no cache do navegador),
 * garantindo que todas as coleções existam e que registros legados recebam um timestamp base (`1`)
 * em `_meta.updatedAt` para que nunca sejam descartados na mesclagem.
 */
export function normalizarDadosErp(raw: unknown): ErpData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Partial<ErpData> & Record<string, unknown>;

  // Verifica se parece um objeto ErpData válido
  const temAlgumaChaveConhecida =
    'obras' in obj ||
    'funcionarios' in obj ||
    'tarefas' in obj ||
    'compras' in obj ||
    'contasPagar' in obj ||
    'config' in obj ||
    'version' in obj;
  if (!temAlgumaChaveConhecida) return null;

  const base = dadosVazios();
  const rawMeta = (obj._meta && typeof obj._meta === 'object' ? obj._meta : {}) as Partial<ErpSyncMeta>;
  const updatedAt: Record<string, number> = { ...(rawMeta.updatedAt || {}) };
  const deletedIds: Record<string, number> = { ...(rawMeta.deletedIds || {}) };

  const out: ErpData = {
    version: DATA_VERSION,
    config: {
      empresa:
        typeof obj.config?.empresa === 'string' && obj.config.empresa.trim()
          ? obj.config.empresa
          : base.config.empresa,
      saldoInicial:
        typeof obj.config?.saldoInicial === 'number' && !Number.isNaN(obj.config.saldoInicial)
          ? obj.config.saldoInicial
          : base.config.saldoInicial,
      dataSaldoInicial:
        typeof obj.config?.dataSaldoInicial === 'string' && obj.config.dataSaldoInicial
          ? obj.config.dataSaldoInicial
          : base.config.dataSaldoInicial,
    },
    obras: Array.isArray(obj.obras) ? obj.obras : [],
    fornecedores: Array.isArray(obj.fornecedores) ? obj.fornecedores : [],
    materiais: Array.isArray(obj.materiais) ? obj.materiais : [],
    compras: Array.isArray(obj.compras) ? obj.compras : [],
    movimentos: Array.isArray(obj.movimentos) ? obj.movimentos : [],
    locacoes: Array.isArray(obj.locacoes) ? obj.locacoes : [],
    funcionarios: Array.isArray(obj.funcionarios) ? obj.funcionarios : [],
    funcoesCustomizadas: Array.isArray(obj.funcoesCustomizadas) ? obj.funcoesCustomizadas : [],
    apontamentos:
      obj.apontamentos && typeof obj.apontamentos === 'object' && !Array.isArray(obj.apontamentos)
        ? (obj.apontamentos as Record<string, Apontamento>)
        : {},
    fechamentos: Array.isArray(obj.fechamentos) ? obj.fechamentos : [],
    servicos: Array.isArray(obj.servicos) ? obj.servicos : [],
    tarefas: Array.isArray(obj.tarefas) ? obj.tarefas : [],
    contasPagar: Array.isArray(obj.contasPagar) ? obj.contasPagar : [],
    contasReceber: Array.isArray(obj.contasReceber) ? obj.contasReceber : [],
    recorrencias: Array.isArray(obj.recorrencias) ? obj.recorrencias : [],
    audit: Array.isArray(obj.audit) ? obj.audit : [],
  };

  // Garante timestamp base (1) para todos os registros existentes (protege dados locais antigos sem _meta)
  for (const col of COLECOES_ARRAY) {
    const lista = out[col] as unknown as EntidadeComId[];
    for (const item of lista) {
      if (item && typeof item.id === 'string') {
        const k = `${col}:${item.id}`;
        if (!updatedAt[k]) updatedAt[k] = 1;
      }
    }
  }

  for (const k of Object.keys(out.apontamentos)) {
    const metaKey = `apontamentos:${k}`;
    if (!updatedAt[metaKey]) updatedAt[metaKey] = 1;
  }

  for (const fn of out.funcoesCustomizadas || []) {
    if (typeof fn === 'string' && fn.trim()) {
      const metaKey = `funcoesCustomizadas:${fn}`;
      if (!updatedAt[metaKey]) updatedAt[metaKey] = 1;
    }
  }

  if (
    !updatedAt['config'] &&
    (out.config.saldoInicial !== 0 || out.config.empresa !== 'CONSTRUTEC')
  ) {
    updatedAt['config'] = 1;
  }

  out._meta = {
    updatedAt,
    deletedIds,
    ...(typeof rawMeta.systemResetAt === 'number' ? { systemResetAt: rawMeta.systemResetAt } : {}),
    ...(typeof rawMeta.lastClientId === 'string' ? { lastClientId: rawMeta.lastClientId } : {}),
    ...(typeof rawMeta.lastWriteAt === 'number' ? { lastWriteAt: rawMeta.lastWriteAt } : {}),
  };

  return out;
}

/**
 * Retorna o maior timestamp conhecido nos metadados `_meta` de um estado `ErpData`
 * (`lastWriteAt`, `systemResetAt`, todos os valores de `updatedAt` e todos os valores de `deletedIds`).
 * Usado pelo Relógio Lógico Monotônico (Hybrid Logical Timestamp) para garantir que edições
 * sequenciais do mesmo usuário em múltiplos aparelhos (ex.: 2 iPhones e 1 iPad com diferenças
 * de relógio / clock skew) sempre gerem um timestamp estritamente crescente.
 */
export function obterMaiorTimestampConhecido(data?: ErpData | null): number {
  if (!data || typeof data !== 'object' || !data._meta) return 0;
  const meta = data._meta;
  let maior = 0;

  if (typeof meta.lastWriteAt === 'number' && Number.isFinite(meta.lastWriteAt) && meta.lastWriteAt > maior) {
    maior = meta.lastWriteAt;
  }
  if (typeof meta.systemResetAt === 'number' && Number.isFinite(meta.systemResetAt) && meta.systemResetAt > maior) {
    maior = meta.systemResetAt;
  }
  if (meta.updatedAt && typeof meta.updatedAt === 'object') {
    for (const ts of Object.values(meta.updatedAt)) {
      if (typeof ts === 'number' && Number.isFinite(ts) && ts > maior) {
        maior = ts;
      }
    }
  }
  if (meta.deletedIds && typeof meta.deletedIds === 'object') {
    for (const ts of Object.values(meta.deletedIds)) {
      if (typeof ts === 'number' && Number.isFinite(ts) && ts > maior) {
        maior = ts;
      }
    }
  }

  return maior;
}

/**
 * Registra nos metadados `_meta` exatamente quais itens foram criados, editados ou excluídos
 * durante uma mutação (`prev` -> `next`).
 * Quando `timestamp !== 1`, aplica Relógio Lógico Monotônico para blindar contra clock skew
 * entre aparelhos do mesmo usuário ou de usuários distintos.
 */
export function registrarMutacaoErp(
  prev: ErpData,
  next: ErpData,
  clientId: string,
  timestamp?: number,
): ErpData {
  const prevNorm = normalizarDadosErp(prev) ?? dadosVazios();
  const agora =
    timestamp === 1
      ? 1
      : Math.max(
          timestamp ?? Date.now(),
          obterMaiorTimestampConhecido(prevNorm) + 1,
          obterMaiorTimestampConhecido(next) + 1,
        );
  const updatedAt: Record<string, number> = {
    ...(prevNorm._meta?.updatedAt || {}),
    ...(next._meta?.updatedAt || {}),
  };
  const deletedIds: Record<string, number> = {
    ...(prevNorm._meta?.deletedIds || {}),
    ...(next._meta?.deletedIds || {}),
  };

  for (const col of COLECOES_ARRAY) {
    const prevList = (prevNorm[col] || []) as unknown as EntidadeComId[];
    const nextList = (next[col] || []) as unknown as EntidadeComId[];

    const prevMap = new Map<string, EntidadeComId>();
    for (const item of prevList) {
      if (item && typeof item.id === 'string') prevMap.set(item.id, item);
    }

    const nextMap = new Map<string, EntidadeComId>();
    for (const item of nextList) {
      if (item && typeof item.id === 'string') nextMap.set(item.id, item);
    }

    // Itens adicionados ou modificados
    for (const [id, item] of nextMap.entries()) {
      const metaKey = `${col}:${id}`;
      const antigo = prevMap.get(id);
      if (!antigo || !igualCanonico(antigo, item)) {
        updatedAt[metaKey] = agora;
        delete deletedIds[metaKey];
      } else if (!updatedAt[metaKey]) {
        updatedAt[metaKey] = 1;
      }
    }

    // Itens explicitamente removidos nesta mutação
    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) {
        const metaKey = `${col}:${id}`;
        deletedIds[metaKey] = agora;
      }
    }
  }

  // Apontamentos
  const prevAp = prevNorm.apontamentos || {};
  const nextAp = next.apontamentos || {};
  for (const [k, val] of Object.entries(nextAp)) {
    const metaKey = `apontamentos:${k}`;
    if (!prevAp[k] || !igualCanonico(prevAp[k], val)) {
      updatedAt[metaKey] = agora;
      delete deletedIds[metaKey];
    } else if (!updatedAt[metaKey]) {
      updatedAt[metaKey] = 1;
    }
  }
  for (const k of Object.keys(prevAp)) {
    if (!(k in nextAp)) {
      const metaKey = `apontamentos:${k}`;
      deletedIds[metaKey] = agora;
    }
  }

  // Funções customizadas
  const prevFnSet = new Set(prevNorm.funcoesCustomizadas || []);
  const nextFnSet = new Set(next.funcoesCustomizadas || []);
  for (const fn of nextFnSet) {
    const metaKey = `funcoesCustomizadas:${fn}`;
    if (!prevFnSet.has(fn)) {
      updatedAt[metaKey] = agora;
      delete deletedIds[metaKey];
    } else if (!updatedAt[metaKey]) {
      updatedAt[metaKey] = 1;
    }
  }
  for (const fn of prevFnSet) {
    if (!nextFnSet.has(fn)) {
      const metaKey = `funcoesCustomizadas:${fn}`;
      deletedIds[metaKey] = agora;
    }
  }

  // Config
  if (!igualCanonico(prevNorm.config, next.config)) {
    updatedAt['config'] = agora;
  }

  next._meta = {
    updatedAt,
    deletedIds,
    ...(prevNorm._meta?.systemResetAt ? { systemResetAt: prevNorm._meta.systemResetAt } : {}),
    lastClientId: clientId,
    lastWriteAt: Math.max(agora, prevNorm._meta?.lastWriteAt ?? 0, next._meta?.lastWriteAt ?? 0),
  };

  return next;
}

/**
 * Desempate determinístico e estritamente comutativo quando o mesmo registro existe
 * em ambos os lados com o mesmo timestamp (ex.: dados legados antes da introdução de `_meta`).
 */
function desempatarEntidade<T extends EntidadeComId>(
  col: ColecaoIdKey,
  localItem: T,
  remotoItem: T,
): T {
  const jsonLocal = canonicalizarJson(localItem);
  const jsonRemoto = canonicalizarJson(remotoItem);
  if (jsonLocal === jsonRemoto) return remotoItem;

  if (col === 'contasPagar') {
    const l = localItem as unknown as ContaPagar;
    const r = remotoItem as unknown as ContaPagar;
    if (l.status !== 'pendente' && r.status === 'pendente') return localItem;
    if (r.status !== 'pendente' && l.status === 'pendente') return remotoItem;
  }

  if (col === 'tarefas') {
    const lConc = Boolean((localItem as Record<string, unknown>).concluida);
    const rConc = Boolean((remotoItem as Record<string, unknown>).concluida);
    if (lConc && !rConc) return localItem;
    if (rConc && !lConc) return remotoItem;
  }

  if (col === 'locacoes') {
    const lFat = Number((localItem as Record<string, unknown>).valorFaturado || 0);
    const rFat = Number((remotoItem as Record<string, unknown>).valorFaturado || 0);
    if (lFat > rFat) return localItem;
    if (rFat > lFat) return remotoItem;
  }

  // Prefere o item com mais campos preenchidos (ex.: apelido, cpf, chavePix adicionados)
  if (jsonLocal.length !== jsonRemoto.length) {
    return jsonLocal.length > jsonRemoto.length ? localItem : remotoItem;
  }
  return jsonLocal >= jsonRemoto ? localItem : remotoItem;
}

/**
 * Mescla de forma determinística, comutativa e segura dois estados `ErpData`
 * (ex.: cache local de Allysson + nuvem de Luiz Gabriel).
 * - Preserva todas as adições feitas em qualquer dispositivo.
 * - Resolve edições no mesmo item usando o timestamp `_meta.updatedAt[colecao:id]`.
 * - Respeita exclusões intencionais registradas em `_meta.deletedIds[colecao:id]`.
 * - NUNCA permite que um documento vazio acidental da nuvem apague registros locais válidos.
 */
export function mesclarDadosErp(
  localRaw: ErpData | null | undefined,
  remotoRaw: ErpData | null | undefined,
): ErpData {
  const local = normalizarDadosErp(localRaw);
  const remoto = normalizarDadosErp(remotoRaw);

  if (!local && !remoto) return dadosVazios();
  if (!local) return structuredClone(remoto!);
  if (!remoto) return structuredClone(local);

  const metaLocal = local._meta ?? { updatedAt: {}, deletedIds: {} };
  const metaRemoto = remoto._meta ?? { updatedAt: {}, deletedIds: {} };

  const resetAt = Math.max(metaLocal.systemResetAt ?? 0, metaRemoto.systemResetAt ?? 0);

  // Mescla mapas de updatedAt e deletedIds
  const mergedUpdatedAt: Record<string, number> = { ...metaLocal.updatedAt };
  for (const [k, ts] of Object.entries(metaRemoto.updatedAt)) {
    mergedUpdatedAt[k] = Math.max(mergedUpdatedAt[k] ?? 0, ts);
  }

  const mergedDeletedIds: Record<string, number> = { ...metaLocal.deletedIds };
  for (const [k, ts] of Object.entries(metaRemoto.deletedIds)) {
    mergedDeletedIds[k] = Math.max(mergedDeletedIds[k] ?? 0, ts);
  }

  // Se um item foi atualizado depois de ter sido deletado, remove o tombstone
  for (const k of Object.keys(mergedDeletedIds)) {
    if ((mergedUpdatedAt[k] ?? 0) > mergedDeletedIds[k]) {
      delete mergedDeletedIds[k];
    }
  }

  const resultado = dadosVazios();

  // 1. Mesclar todas as 13 coleções de entidades com ID
  for (const col of COLECOES_ARRAY) {
    const listaLocal = (local[col] || []) as unknown as EntidadeComId[];
    const listaRemota = (remoto[col] || []) as unknown as EntidadeComId[];

    const mapLocal = new Map<string, EntidadeComId>();
    for (const item of listaLocal) {
      if (item && typeof item.id === 'string') mapLocal.set(item.id, item);
    }

    const mapRemoto = new Map<string, EntidadeComId>();
    for (const item of listaRemota) {
      if (item && typeof item.id === 'string') mapRemoto.set(item.id, item);
    }

    // Mantém ordem estável: itens existentes na base seguidos de novos itens
    const todosIds = new Set<string>([...mapLocal.keys(), ...mapRemoto.keys()]);
    const listaMesclada: EntidadeComId[] = [];

    for (const id of todosIds) {
      const metaKey = `${col}:${id}`;
      const itemL = mapLocal.get(id);
      const itemR = mapRemoto.get(id);

      const tsL = itemL ? (metaLocal.updatedAt[metaKey] ?? 1) : 0;
      const tsR = itemR ? (metaRemoto.updatedAt[metaKey] ?? 1) : 0;
      const maxTs = Math.max(tsL, tsR);
      const delTs = mergedDeletedIds[metaKey] ?? 0;

      // Se foi explicitamente excluído e não foi recriado depois, ignora
      if (delTs > 0 && delTs >= maxTs) {
        continue;
      }

      // Se houve um reset explícito do sistema posterior ao item, ignora
      if (resetAt > 0 && maxTs < resetAt) {
        continue;
      }

      mergedUpdatedAt[metaKey] = maxTs;

      if (itemL && itemR) {
        if (tsL > tsR) {
          listaMesclada.push(structuredClone(itemL));
        } else if (tsR > tsL) {
          listaMesclada.push(structuredClone(itemR));
        } else {
          listaMesclada.push(structuredClone(desempatarEntidade(col, itemL, itemR)));
        }
      } else if (itemL) {
        listaMesclada.push(structuredClone(itemL));
      } else if (itemR) {
        listaMesclada.push(structuredClone(itemR));
      }
    }

    (resultado as unknown as Record<string, unknown>)[col] = listaMesclada;
  }

  // Deduplicação extra para contas a pagar geradas automaticamente por recorrência no mesmo mês
  if (resultado.contasPagar.length > 1) {
    const vistasRecorrencia = new Map<string, ContaPagar>();
    const contasSemDuplicata: ContaPagar[] = [];

    for (const cp of resultado.contasPagar) {
      if (cp.origem === 'recorrencia' && cp.origemId && cp.vencimento) {
        const chaveRec = `${cp.origemId}|${cp.vencimento}`;
        const existente = vistasRecorrencia.get(chaveRec);
        if (!existente) {
          vistasRecorrencia.set(chaveRec, cp);
          contasSemDuplicata.push(cp);
        } else if (cp.status === 'pago' && existente.status !== 'pago') {
          const idx = contasSemDuplicata.indexOf(existente);
          if (idx >= 0) contasSemDuplicata[idx] = cp;
          vistasRecorrencia.set(chaveRec, cp);
        }
      } else {
        contasSemDuplicata.push(cp);
      }
    }
    resultado.contasPagar = contasSemDuplicata;
  }

  // 2. Mesclar apontamentos (chave `${funcionarioId}|${data}`)
  const apLocal = local.apontamentos || {};
  const apRemoto = remoto.apontamentos || {};
  const todasChavesAp = new Set<string>([...Object.keys(apLocal), ...Object.keys(apRemoto)]);
  const apMesclado: Record<string, Apontamento> = {};

  for (const k of todasChavesAp) {
    const metaKey = `apontamentos:${k}`;
    const itemL = apLocal[k];
    const itemR = apRemoto[k];

    const tsL = itemL ? (metaLocal.updatedAt[metaKey] ?? 1) : 0;
    const tsR = itemR ? (metaRemoto.updatedAt[metaKey] ?? 1) : 0;
    const maxTs = Math.max(tsL, tsR);
    const delTs = mergedDeletedIds[metaKey] ?? 0;

    if (delTs > 0 && delTs >= maxTs) continue;
    if (resetAt > 0 && maxTs < resetAt) continue;

    mergedUpdatedAt[metaKey] = maxTs;

    if (itemL && itemR) {
      if (tsL > tsR) {
        apMesclado[k] = structuredClone(itemL);
      } else if (tsR > tsL) {
        apMesclado[k] = structuredClone(itemR);
      } else {
        const jsonL = canonicalizarJson(itemL);
        const jsonR = canonicalizarJson(itemR);
        if (itemL.status !== 'falta' && itemR.status === 'falta') {
          apMesclado[k] = structuredClone(itemL);
        } else if (itemR.status !== 'falta' && itemL.status === 'falta') {
          apMesclado[k] = structuredClone(itemR);
        } else {
          const lenL = itemL.centroIds?.length ?? 0;
          const lenR = itemR.centroIds?.length ?? 0;
          if (lenL !== lenR) {
            apMesclado[k] = structuredClone(lenL > lenR ? itemL : itemR);
          } else {
            apMesclado[k] = structuredClone(jsonL >= jsonR ? itemL : itemR);
          }
        }
      }
    } else if (itemL) {
      apMesclado[k] = structuredClone(itemL);
    } else if (itemR) {
      apMesclado[k] = structuredClone(itemR);
    }
  }
  resultado.apontamentos = apMesclado;

  // 3. Mesclar funções customizadas (respeitando exclusões e systemResetAt)
  const todasFuncoes = new Set<string>([
    ...(local.funcoesCustomizadas || []),
    ...(remoto.funcoesCustomizadas || []),
  ]);
  const funcoesMescladas: string[] = [];
  for (const fn of todasFuncoes) {
    if (typeof fn !== 'string' || !fn.trim()) continue;
    const metaKey = `funcoesCustomizadas:${fn}`;
    const hasL = (local.funcoesCustomizadas || []).includes(fn);
    const hasR = (remoto.funcoesCustomizadas || []).includes(fn);
    const tsL = hasL ? (metaLocal.updatedAt[metaKey] ?? 1) : 0;
    const tsR = hasR ? (metaRemoto.updatedAt[metaKey] ?? 1) : 0;
    const maxTs = Math.max(tsL, tsR);
    const delTs = mergedDeletedIds[metaKey] ?? 0;

    if (delTs > 0 && delTs >= maxTs) continue;
    if (resetAt > 0 && maxTs < resetAt) continue;

    mergedUpdatedAt[metaKey] = maxTs;
    funcoesMescladas.push(fn);
  }
  resultado.funcoesCustomizadas = funcoesMescladas;

  // 4. Mesclar configurações (respeitando systemResetAt e comutatividade)
  const rawTsCfgL = metaLocal.updatedAt['config'] ?? 0;
  const rawTsCfgR = metaRemoto.updatedAt['config'] ?? 0;
  const tsCfgL = resetAt > 0 && rawTsCfgL < resetAt ? 0 : rawTsCfgL;
  const tsCfgR = resetAt > 0 && rawTsCfgR < resetAt ? 0 : rawTsCfgR;

  if (tsCfgL > tsCfgR) {
    resultado.config = structuredClone(local.config);
  } else if (tsCfgR > tsCfgL) {
    resultado.config = structuredClone(remoto.config);
  } else if (tsCfgL === 0 && tsCfgR === 0 && resetAt > 0) {
    resultado.config = dadosVazios().config;
  } else {
    const customL = local.config.saldoInicial !== 0 || local.config.empresa !== 'CONSTRUTEC';
    const customR = remoto.config.saldoInicial !== 0 || remoto.config.empresa !== 'CONSTRUTEC';
    if (customL && !customR) {
      resultado.config = structuredClone(local.config);
    } else if (customR && !customL) {
      resultado.config = structuredClone(remoto.config);
    } else {
      const jsonCfgL = canonicalizarJson(local.config);
      const jsonCfgR = canonicalizarJson(remoto.config);
      resultado.config = structuredClone(jsonCfgL >= jsonCfgR ? local.config : remoto.config);
    }
  }
  if (Math.max(tsCfgL, tsCfgR) > 0) {
    mergedUpdatedAt['config'] = Math.max(tsCfgL, tsCfgR);
  }

  // 5. Mesclar auditoria (união por ID ordenada por timestamp decrescente, respeitando systemResetAt, limite 500)
  const auditMap = new Map<string, AuditEntry>();
  for (const a of [...(local.audit || []), ...(remoto.audit || [])]) {
    if (a && typeof a.id === 'string' && !auditMap.has(a.id)) {
      if (resetAt > 0 && a.ts) {
        const parsedTs = Date.parse(a.ts);
        if (!Number.isNaN(parsedTs) && parsedTs < resetAt - 1000) {
          continue;
        }
      }
      auditMap.set(a.id, a);
    }
  }
  resultado.audit = Array.from(auditMap.values())
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
    .slice(0, 500);

  const lastWriteL = metaLocal.lastWriteAt ?? 0;
  const lastWriteR = metaRemoto.lastWriteAt ?? 0;
  let maiorConhecido = Math.max(
    lastWriteL,
    lastWriteR,
    resetAt,
    obterMaiorTimestampConhecido(local),
    obterMaiorTimestampConhecido(remoto),
  );
  for (const ts of Object.values(mergedUpdatedAt)) {
    if (typeof ts === 'number' && Number.isFinite(ts) && ts > maiorConhecido) maiorConhecido = ts;
  }
  for (const ts of Object.values(mergedDeletedIds)) {
    if (typeof ts === 'number' && Number.isFinite(ts) && ts > maiorConhecido) maiorConhecido = ts;
  }

  resultado._meta = {
    updatedAt: mergedUpdatedAt,
    deletedIds: mergedDeletedIds,
    ...(resetAt > 0 ? { systemResetAt: resetAt } : {}),
    lastClientId:
      lastWriteL >= lastWriteR
        ? (metaLocal.lastClientId ?? metaRemoto.lastClientId)
        : (metaRemoto.lastClientId ?? metaLocal.lastClientId),
    lastWriteAt: maiorConhecido > 1 ? maiorConhecido : Date.now(),
  };

  return resultado;
}

/**
 * Gera uma impressão digital (fingerprint) canônica apenas dos dados de domínio e tombstones,
 * ordenando coleções por ID. Usado para saber se dois estados possuem exatamente o mesmo
 * conteúdo de negócio (evitando loops de regravação no Firestore).
 */
export function fingerprintDominio(data: ErpData | null | undefined): string {
  const norm = normalizarDadosErp(data);
  if (!norm) return '';

  const colecoesOrdenadas: Record<string, unknown[]> = {};
  for (const col of COLECOES_ARRAY) {
    const arr = [...((norm[col] || []) as unknown as EntidadeComId[])];
    arr.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    colecoesOrdenadas[col] = arr;
  }

  const funcoes = [...(norm.funcoesCustomizadas || [])].sort();

  return canonicalizarJson({
    config: norm.config,
    colecoes: colecoesOrdenadas,
    apontamentos: norm.apontamentos,
    funcoesCustomizadas: funcoes,
    deletedIds: norm._meta?.deletedIds || {},
    systemResetAt: norm._meta?.systemResetAt || 0,
  });
}

/**
 * Remove valores `undefined` recursivamente para compatibilidade estrita com o Cloud Firestore.
 */
export function sanitizarParaFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
