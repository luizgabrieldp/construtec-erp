import { create } from 'zustand';
import type { ErpData } from '@/domain/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocFromServer, setDoc, onSnapshot } from 'firebase/firestore';
import {
  contarRegistrosErp,
  fingerprintDominio,
  mesclarDadosErp,
  normalizarDadosErp,
  obterMaiorTimestampConhecido,
  possuiEstadoSincronizavelErp,
  sanitizarParaFirestore,
} from './sync';

export interface SaveOptions {
  forceReset?: boolean;
}

export interface SyncStatusState {
  online: boolean;
  syncing: boolean;
  latencyMs: number | null;
  pendingCount: number;
  lastSyncedAt: number | null;
}

export interface ErpRepository {
  load(): ErpData | null;
  save(data: ErpData, options?: SaveOptions): void;
  clear(): void;
  getClientId(): string;
  /** Notifica quando os dados mudam em tempo real (Firestore na nuvem ou outra aba) */
  subscribe(onExternalChange: () => void): () => void;
  /** Dispara uma sincronização e medição de latência imediata com o servidor */
  forcarSincronizacaoAgora(): Promise<void>;
}

const LOCAL_KEY = 'construtec:data';
const LOCAL_BACKUP_KEY = 'construtec:data:backup';
const LOCAL_VAULT_KEY = 'construtec:data:vault';
const LOCAL_DIRTY_KEY = 'construtec:erp:dirty:v1';
const LOCAL_PENDING_COUNT_KEY = 'construtec:erp:pending_count:v1';
const CLIENT_ID_KEY = 'construtec:client_id';

const ERP_DOC_REF = doc(db, 'erp', 'dados');
const ERP_BACKUP_REF = doc(db, 'erp', 'backup_auto');

function lerDirtyInicial(): { dirty: boolean; count: number } {
  try {
    const dirty = localStorage.getItem(LOCAL_DIRTY_KEY) === '1';
    const rawCount = Number(localStorage.getItem(LOCAL_PENDING_COUNT_KEY) || '0');
    const count = dirty ? Math.max(1, Number.isFinite(rawCount) ? rawCount : 1) : 0;
    return { dirty, count };
  } catch {
    return { dirty: false, count: 0 };
  }
}

function navegadorOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  } catch {
    return true;
  }
}

const inicialDirty = lerDirtyInicial();

export const useSyncStatus = create<SyncStatusState>()(() => ({
  online: navegadorOnline(),
  syncing: false,
  latencyMs: null,
  pendingCount: inicialDirty.count,
  lastSyncedAt: null,
}));

function atualizarSyncStatus(patch: Partial<SyncStatusState>): void {
  useSyncStatus.setState((prev) => ({ ...prev, ...patch }));
}

function agoraPerf(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

async function lerDocComLatencia(ref: ReturnType<typeof doc>) {
  const t0 = agoraPerf();
  try {
    const snap = await getDocFromServer(ref);
    const lat = Math.max(1, Math.round(agoraPerf() - t0));
    atualizarSyncStatus({ online: true, latencyMs: lat, lastSyncedAt: Date.now() });
    return { snap, fromServer: true };
  } catch (err) {
    // Se getDocFromServer falhou, a rede/servidor está indisponível no momento
    atualizarSyncStatus({ online: false });
    throw err;
  }
}

class FirestoreRepository implements ErpRepository {
  private lastCloudData: ErpData | null = null;
  private pendingSync: { data: ErpData; forceReset: boolean } | null = null;
  private isSyncing = false;
  private hasBackedUpThisSession = false;
  private fallbackClientId = `cli_${Math.random().toString(36).slice(2, 10)}`;
  private listeners = new Set<() => void>();

  getClientId(): string {
    try {
      let id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id) {
        id = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    } catch {
      return this.fallbackClientId;
    }
  }

  private marcarDirtyLocal(increment = true): void {
    try {
      const atual = useSyncStatus.getState().pendingCount;
      const proximo = increment ? atual + 1 : Math.max(1, atual);
      localStorage.setItem(LOCAL_DIRTY_KEY, '1');
      localStorage.setItem(LOCAL_PENDING_COUNT_KEY, String(proximo));
      atualizarSyncStatus({ pendingCount: proximo });
    } catch {
      atualizarSyncStatus({
        pendingCount: increment ? useSyncStatus.getState().pendingCount + 1 : Math.max(1, useSyncStatus.getState().pendingCount),
      });
    }
  }

  private limparDirtyLocal(): void {
    try {
      localStorage.removeItem(LOCAL_DIRTY_KEY);
      localStorage.removeItem(LOCAL_PENDING_COUNT_KEY);
    } catch {}
    atualizarSyncStatus({ pendingCount: 0 });
  }

  private possuiPendenciaLocal(): boolean {
    try {
      return localStorage.getItem(LOCAL_DIRTY_KEY) === '1' || useSyncStatus.getState().pendingCount > 0;
    } catch {
      return useSyncStatus.getState().pendingCount > 0;
    }
  }

  private lerChaveLocal(key: string): ErpData | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return normalizarDadosErp(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /**
   * Carrega e consolida todos os dados locais disponíveis no dispositivo
   * (`construtec:data`, `construtec:data:backup` e `construtec:data:vault`).
   * Assim que encontrar registros locais válidos, já garante cópia segura no cofre local
   * antes que qualquer evento de rede possa interferir.
   */
  load(): ErpData | null {
    const principal = this.lerChaveLocal(LOCAL_KEY);
    const backup = this.lerChaveLocal(LOCAL_BACKUP_KEY);
    const vault = this.lerChaveLocal(LOCAL_VAULT_KEY);

    // Se houve um reset intencional explícito mais recente no principal, respeita-o
    const resetPrincipal = principal?._meta?.systemResetAt ?? 0;
    const resetBackup = Math.max(
      backup?._meta?.systemResetAt ?? 0,
      vault?._meta?.systemResetAt ?? 0,
    );
    if (principal && resetPrincipal > 0 && resetPrincipal >= resetBackup && contarRegistrosErp(principal) === 0) {
      return principal;
    }

    let consolidado: ErpData | null = null;
    for (const candidato of [vault, backup, principal]) {
      if (!candidato) continue;
      consolidado = consolidado ? mesclarDadosErp(consolidado, candidato) : candidato;
    }

    if (!consolidado) return null;

    // Se há dados reais no dispositivo, protege imediatamente no backup/vault local
    if (contarRegistrosErp(consolidado) > 0) {
      try {
        const json = JSON.stringify(consolidado);
        localStorage.setItem(LOCAL_BACKUP_KEY, json);
        localStorage.setItem(LOCAL_VAULT_KEY, json);
        if (!principal || fingerprintDominio(principal) !== fingerprintDominio(consolidado)) {
          localStorage.setItem(LOCAL_KEY, json);
        }
      } catch {}
    }

    return consolidado;
  }

  private persistirLocal(data: ErpData, options?: SaveOptions): void {
    const norm = normalizarDadosErp(data);
    if (!norm) return;

    try {
      const json = JSON.stringify(norm);
      localStorage.setItem(LOCAL_KEY, json);

      if (options?.forceReset) {
        localStorage.setItem(LOCAL_BACKUP_KEY, json);
        localStorage.setItem(LOCAL_VAULT_KEY, json);
      } else if (possuiEstadoSincronizavelErp(norm)) {
        const backupAtual = this.lerChaveLocal(LOCAL_BACKUP_KEY);
        const novoBackup = backupAtual ? mesclarDadosErp(backupAtual, norm) : norm;
        const jsonBackup = JSON.stringify(novoBackup);
        localStorage.setItem(LOCAL_BACKUP_KEY, jsonBackup);
        localStorage.setItem(LOCAL_VAULT_KEY, jsonBackup);
      }
    } catch (e) {
      console.warn('[CONSTRUTEC] Falha ao salvar no cache local:', e);
    }
  }

  private notificarListeners(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {}
    }
  }

  save(data: ErpData, options?: SaveOptions): void {
    const norm = normalizarDadosErp(data);
    if (!norm) return;

    if (options?.forceReset) {
      this.lastCloudData = norm;
      this.persistirLocal(norm, { forceReset: true });
      this.marcarDirtyLocal(true);
      this.agendarSincronizacaoNuvem(norm, true);
      return;
    }

    // Mescla com dados locais e com o último estado conhecido da nuvem para nunca perder dados concorrentes
    const baseLocal = this.load();
    let consolidado = baseLocal ? mesclarDadosErp(baseLocal, norm) : norm;
    if (this.lastCloudData) {
      consolidado = mesclarDadosErp(this.lastCloudData, consolidado);
    }

    // Trava de segurança: jamais gravar um estado em branco acidental (sem registros, sem tombstones e sem systemResetAt)
    if (!possuiEstadoSincronizavelErp(consolidado)) {
      return;
    }

    this.lastCloudData = consolidado;
    this.persistirLocal(consolidado);
    this.marcarDirtyLocal(true);
    this.agendarSincronizacaoNuvem(consolidado, false);
  }

  private agendarSincronizacaoNuvem(data: ErpData, forceReset = false): void {
    if (forceReset) {
      this.pendingSync = { data, forceReset: true };
    } else if (this.pendingSync) {
      this.pendingSync = {
        data: mesclarDadosErp(this.pendingSync.data, data),
        forceReset: this.pendingSync.forceReset,
      };
    } else {
      this.pendingSync = { data, forceReset: false };
    }

    void this.processarFilaSincronizacao();
  }

  private reencolherPendencia(alvo: ErpData, forceReset: boolean): void {
    const pendenteAtual = this.pendingSync;
    this.pendingSync = pendenteAtual
      ? {
          data: mesclarDadosErp(alvo, pendenteAtual.data),
          forceReset: pendenteAtual.forceReset || forceReset,
        }
      : { data: alvo, forceReset };
  }

  private async processarFilaSincronizacao(): Promise<void> {
    if (this.isSyncing) return;

    if (!navegadorOnline()) {
      atualizarSyncStatus({ online: false, syncing: false });
      return;
    }

    this.isSyncing = true;
    atualizarSyncStatus({ syncing: true });

    try {
      while (this.pendingSync) {
        const item = this.pendingSync;
        this.pendingSync = null;

        let alvo = item.data;
        const forceReset = item.forceReset;
        let nuvemAtual: ErpData | null = null;

        if (!forceReset) {
          // Busca OBRIGATORIAMENTE o documento mais recente do SERVIDOR antes de gravar
          // para mesclar alterações feitas por outros usuários enquanto este aparelho estava offline.
          try {
            const { snap: snapAtual } = await lerDocComLatencia(ERP_DOC_REF);
            if (snapAtual.exists()) {
              nuvemAtual = normalizarDadosErp(snapAtual.data());
              if (nuvemAtual && possuiEstadoSincronizavelErp(nuvemAtual)) {
                alvo = mesclarDadosErp(nuvemAtual, alvo);
              }
            }
          } catch {
            // Sem conexão real com o servidor: mantém na fila pendente e preserva a flag dirty no localStorage
            this.reencolherPendencia(alvo, forceReset);
            this.marcarDirtyLocal(false);
            atualizarSyncStatus({ online: false, syncing: false });
            return;
          }

          // Segunda trava de segurança antes do setDoc
          if (!possuiEstadoSincronizavelErp(alvo)) {
            this.limparDirtyLocal();
            continue;
          }
        }

        const localAntes = this.lerChaveLocal(LOCAL_KEY);
        this.lastCloudData = alvo;
        this.persistirLocal(alvo, { forceReset });

        if (
          !localAntes ||
          fingerprintDominio(localAntes) !== fingerprintDominio(alvo) ||
          obterMaiorTimestampConhecido(alvo) > obterMaiorTimestampConhecido(localAntes)
        ) {
          this.notificarListeners();
        }

        const jaSincronizadoNaNuvem =
          !forceReset &&
          nuvemAtual !== null &&
          possuiEstadoSincronizavelErp(nuvemAtual) &&
          fingerprintDominio(nuvemAtual) === fingerprintDominio(alvo) &&
          (nuvemAtual.audit?.length ?? 0) === (alvo.audit?.length ?? 0) &&
          obterMaiorTimestampConhecido(nuvemAtual) >= obterMaiorTimestampConhecido(alvo);

        const payload = sanitizarParaFirestore(alvo);

        if (!jaSincronizadoNaNuvem) {
          try {
            const tWrite0 = agoraPerf();
            await setDoc(ERP_DOC_REF, payload);
            const snapConfirm = await getDocFromServer(ERP_DOC_REF);
            const writeLat = Math.max(1, Math.round(agoraPerf() - tWrite0));
            atualizarSyncStatus({ online: true, latencyMs: writeLat, lastSyncedAt: Date.now() });
            if (snapConfirm.exists()) {
              const confirmado = normalizarDadosErp(snapConfirm.data());
              if (confirmado && possuiEstadoSincronizavelErp(confirmado)) {
                const posConfirm = mesclarDadosErp(alvo, confirmado);
                this.lastCloudData = posConfirm;
                if (fingerprintDominio(posConfirm) !== fingerprintDominio(alvo)) {
                  this.persistirLocal(posConfirm, { forceReset });
                  this.notificarListeners();
                }
              }
            }
          } catch (writeErr) {
            this.reencolherPendencia(alvo, forceReset);
            this.marcarDirtyLocal(false);
            throw writeErr;
          }
        } else {
          atualizarSyncStatus({ online: true, lastSyncedAt: Date.now() });
        }

        // Se nenhuma outra mutação entrou enquanto gravava, limpa a fila dirty persistida
        if (!this.pendingSync) {
          this.limparDirtyLocal();
        }

        // Gravação automática em segundo plano nos documentos de backup da nuvem
        if (possuiEstadoSincronizavelErp(alvo) && !alvo._meta?.systemResetAt) {
          if (!jaSincronizadoNaNuvem || !this.hasBackedUpThisSession) {
            setDoc(ERP_BACKUP_REF, payload).catch(() => {});
          }
          if (contarRegistrosErp(alvo) > 0 && !this.hasBackedUpThisSession) {
            this.hasBackedUpThisSession = true;
            const deviceBackupRef = doc(db, 'erp', `backup_${this.getClientId()}`);
            setDoc(deviceBackupRef, payload).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[CONSTRUTEC] Sincronização em nuvem pendente/offline:', err);
      this.marcarDirtyLocal(false);
      atualizarSyncStatus({ online: false });
    } finally {
      this.isSyncing = false;
      atualizarSyncStatus({ syncing: false });
    }
  }

  async forcarSincronizacaoAgora(): Promise<void> {
    if (!navegadorOnline()) {
      atualizarSyncStatus({ online: false, syncing: false });
      return;
    }

    const local = this.load();
    if (this.possuiPendenciaLocal() && local && possuiEstadoSincronizavelErp(local)) {
      this.agendarSincronizacaoNuvem(local, false);
      return;
    }

    atualizarSyncStatus({ syncing: true });
    try {
      const { snap } = await lerDocComLatencia(ERP_DOC_REF);
      if (snap.exists()) {
        const dadosNuvem = normalizarDadosErp(snap.data());
        if (dadosNuvem && possuiEstadoSincronizavelErp(dadosNuvem)) {
          const mesclado = local ? mesclarDadosErp(local, dadosNuvem) : dadosNuvem;
          this.lastCloudData = mesclado;
          const fpLocal = local ? fingerprintDominio(local) : '';
          const fpMesclado = fingerprintDominio(mesclado);
          const fpNuvem = fingerprintDominio(dadosNuvem);
          const tsAvancou =
            obterMaiorTimestampConhecido(mesclado) > obterMaiorTimestampConhecido(local);

          if (fpMesclado !== fpLocal || tsAvancou) {
            this.persistirLocal(mesclado);
            this.notificarListeners();
          }

          if (fpMesclado !== fpNuvem && possuiEstadoSincronizavelErp(mesclado)) {
            this.marcarDirtyLocal(false);
            this.agendarSincronizacaoNuvem(mesclado, false);
          } else {
            this.limparDirtyLocal();
          }
        }
      } else if (local && possuiEstadoSincronizavelErp(local)) {
        this.agendarSincronizacaoNuvem(local, false);
      }
    } catch {
      atualizarSyncStatus({ online: false });
    } finally {
      if (!this.isSyncing) {
        atualizarSyncStatus({ syncing: false });
      }
    }
  }

  /**
   * Tenta recuperar dados dos backups automáticos da nuvem (`erp/backup_auto` e `erp/backup_<clientId>`)
   * caso o documento principal `erp/dados` tenha sido zerado acidentalmente.
   */
  private async tentarResgatarDoBackupNuvem(localAtual: ErpData | null): Promise<void> {
    let resgatado: ErpData | null =
      localAtual && possuiEstadoSincronizavelErp(localAtual) ? localAtual : null;

    try {
      const snapBackup = await getDoc(ERP_BACKUP_REF);
      if (snapBackup.exists()) {
        const dadosBackup = normalizarDadosErp(snapBackup.data());
        if (dadosBackup && contarRegistrosErp(dadosBackup) > 0) {
          resgatado = resgatado ? mesclarDadosErp(dadosBackup, resgatado) : dadosBackup;
        }
      }

      if (!resgatado || contarRegistrosErp(resgatado) === 0) {
        const deviceBackupRef = doc(db, 'erp', `backup_${this.getClientId()}`);
        const snapDevice = await getDoc(deviceBackupRef);
        if (snapDevice.exists()) {
          const dadosDevice = normalizarDadosErp(snapDevice.data());
          if (dadosDevice && contarRegistrosErp(dadosDevice) > 0) {
            resgatado = resgatado ? mesclarDadosErp(dadosDevice, resgatado) : dadosDevice;
          }
        }
      }
    } catch {
      // Offline: mantém os dados locais intactos
    }

    if (resgatado && possuiEstadoSincronizavelErp(resgatado)) {
      this.lastCloudData = resgatado;
      this.persistirLocal(resgatado);
      this.notificarListeners();
      this.agendarSincronizacaoNuvem(resgatado, false);
    }
  }

  clear(): void {
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(LOCAL_BACKUP_KEY);
    localStorage.removeItem(LOCAL_VAULT_KEY);
    this.limparDirtyLocal();
  }

  subscribe(onExternalChange: () => void): () => void {
    this.listeners.add(onExternalChange);

    // 1. Garante imediatamente no boot que qualquer dado local existente seja protegido no cofre local
    // e já agenda o resgate/sincronização com a nuvem sem esperar múltiplos round-trips
    const inicialLocal = this.load();
    if (inicialLocal && (contarRegistrosErp(inicialLocal) > 0 || this.possuiPendenciaLocal())) {
      this.persistirLocal(inicialLocal);
      this.agendarSincronizacaoNuvem(inicialLocal, false);
    } else {
      void this.forcarSincronizacaoAgora();
    }

    // 2. Sincronização em tempo real via Cloud Firestore com mesclagem inteligente e resgate automático
    let ultimoSnapshotMs = agoraPerf();
    const unsubscribeFirestore = onSnapshot(
      ERP_DOC_REF,
      { includeMetadataChanges: true },
      (snapshot) => {
        const agoraSnap = agoraPerf();
        if (!snapshot.metadata.fromCache) {
          const lat = useSyncStatus.getState().latencyMs ?? Math.max(8, Math.min(450, Math.round(agoraSnap - ultimoSnapshotMs)));
          atualizarSyncStatus({
            online: true,
            latencyMs: lat,
            lastSyncedAt: Date.now(),
          });
        }
        ultimoSnapshotMs = agoraSnap;

        const local = this.load();

        if (snapshot.exists()) {
          const dadosNuvem = normalizarDadosErp(snapshot.data());

          // Caso A: Documento na nuvem está em branco sem ter sido zerado/deletado intencionalmente (ex.: wipe acidental)
          if (!dadosNuvem || !possuiEstadoSincronizavelErp(dadosNuvem)) {
            if (local && possuiEstadoSincronizavelErp(local)) {
              // Resgata imediatamente os dados locais deste aparelho (Allysson / Luiz Gabriel) para a nuvem!
              void this.tentarResgatarDoBackupNuvem(local);
            } else {
              // Se este aparelho também está vazio, verifica se há backup salvo na nuvem (`erp/backup_auto`)
              void this.tentarResgatarDoBackupNuvem(null);
            }
            return;
          }

          // Caso B: Nuvem possui estado válido -> Mescla local + nuvem sem perder nada
          const mesclado = local ? mesclarDadosErp(local, dadosNuvem) : dadosNuvem;
          this.lastCloudData = mesclado;

          const fpNuvem = fingerprintDominio(dadosNuvem);
          const fpMesclado = fingerprintDominio(mesclado);
          const fpLocal = local ? fingerprintDominio(local) : '';
          const tsAvancou =
            obterMaiorTimestampConhecido(mesclado) > obterMaiorTimestampConhecido(local);

          if (fpMesclado !== fpLocal || tsAvancou) {
            this.persistirLocal(mesclado);
            this.notificarListeners();
          }

          // Se o aparelho local tinha registros/edições/exclusões que ainda não estavam na nuvem, envia a união para o Firestore
          if (fpMesclado !== fpNuvem && possuiEstadoSincronizavelErp(mesclado)) {
            this.marcarDirtyLocal(false);
            this.agendarSincronizacaoNuvem(mesclado, false);
          } else {
            if (!snapshot.metadata.fromCache && !this.pendingSync && !this.isSyncing) {
              this.limparDirtyLocal();
            }
            if (contarRegistrosErp(mesclado) > 0 && !this.hasBackedUpThisSession) {
              this.hasBackedUpThisSession = true;
              const payload = sanitizarParaFirestore(mesclado);
              setDoc(ERP_BACKUP_REF, payload).catch(() => {});
            }
          }
        } else {
          // Caso C: Documento `erp/dados` ainda não existe na nuvem -> resgata do local ou do backup na nuvem
          void this.tentarResgatarDoBackupNuvem(local);
        }
      },
      (error) => {
        console.warn('[CONSTRUTEC] Listener do Firestore desconectado:', error);
        atualizarSyncStatus({ online: false });
      },
    );

    // 3. Sincronização entre abas locais via evento Storage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY || e.key === LOCAL_BACKUP_KEY || e.key === null) {
        onExternalChange();
      }
      if (e.key === LOCAL_DIRTY_KEY || e.key === LOCAL_PENDING_COUNT_KEY || e.key === null) {
        const d = lerDirtyInicial();
        atualizarSyncStatus({ pendingCount: d.count });
      }
    };
    // 4. Re-sincronizar automaticamente quando o celular/navegador reconectar à internet ou voltar ao foco (iOS/iPadOS Safari e PWA)
    const handleOnlineOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      atualizarSyncStatus({ online: navegadorOnline() });
      const atual = this.load();
      if (atual && (possuiEstadoSincronizavelErp(atual) || this.possuiPendenciaLocal())) {
        this.agendarSincronizacaoNuvem(atual, false);
      } else {
        void this.forcarSincronizacaoAgora();
      }
    };

    const handleOffline = () => {
      atualizarSyncStatus({ online: false, syncing: false });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('online', handleOnlineOrVisible);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('focus', handleOnlineOrVisible);
      window.addEventListener('pageshow', handleOnlineOrVisible);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleOnlineOrVisible);
    }

    // 5. Heartbeat leve periódico (~25s) enquanto a aba estiver visível para medir latência real e garantir sincronia
    const heartbeatId =
      typeof window !== 'undefined' && typeof window.setInterval === 'function'
        ? window.setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            if (!navegadorOnline()) {
              atualizarSyncStatus({ online: false });
              return;
            }
            void this.forcarSincronizacaoAgora();
          }, 25000)
        : null;

    return () => {
      this.listeners.delete(onExternalChange);
      unsubscribeFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('online', handleOnlineOrVisible);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('focus', handleOnlineOrVisible);
        window.removeEventListener('pageshow', handleOnlineOrVisible);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleOnlineOrVisible);
      }
      if (heartbeatId !== null && typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
        window.clearInterval(heartbeatId);
      }
    };
  }
}

export const repository: ErpRepository = new FirestoreRepository();
export const forcarSincronizacaoAgora = () => repository.forcarSincronizacaoAgora();

