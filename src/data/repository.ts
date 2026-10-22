import type { ErpData } from '@/domain/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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

export interface ErpRepository {
  load(): ErpData | null;
  save(data: ErpData, options?: SaveOptions): void;
  clear(): void;
  getClientId(): string;
  /** Notifica quando os dados mudam em tempo real (Firestore na nuvem ou outra aba) */
  subscribe(onExternalChange: () => void): () => void;
}

const LOCAL_KEY = 'construtec:data';
const LOCAL_BACKUP_KEY = 'construtec:data:backup';
const LOCAL_VAULT_KEY = 'construtec:data:vault';
const CLIENT_ID_KEY = 'construtec:client_id';

const ERP_DOC_REF = doc(db, 'erp', 'dados');
const ERP_BACKUP_REF = doc(db, 'erp', 'backup_auto');

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

  private async processarFilaSincronizacao(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      while (this.pendingSync) {
        const item = this.pendingSync;
        this.pendingSync = null;

        let alvo = item.data;
        const forceReset = item.forceReset;
        let nuvemAtual: ErpData | null = null;

        if (!forceReset) {
          // Busca o documento mais recente da nuvem antes de gravar para mesclar alterações simultâneas do outro usuário
          try {
            const snapAtual = await getDoc(ERP_DOC_REF);
            if (snapAtual.exists()) {
              nuvemAtual = normalizarDadosErp(snapAtual.data());
              if (nuvemAtual && possuiEstadoSincronizavelErp(nuvemAtual)) {
                alvo = mesclarDadosErp(nuvemAtual, alvo);
              }
            }
          } catch {
            // Sem conexão no momento; prossegue com o estado mesclado localmente
          }

          // Segunda trava de segurança antes do setDoc
          if (!possuiEstadoSincronizavelErp(alvo)) {
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
          await setDoc(ERP_DOC_REF, payload);
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
    } finally {
      this.isSyncing = false;
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
  }

  subscribe(onExternalChange: () => void): () => void {
    this.listeners.add(onExternalChange);

    // 1. Garante imediatamente no boot que qualquer dado local existente seja protegido no cofre local
    // e já agenda o resgate/sincronização com a nuvem sem esperar múltiplos round-trips
    const inicialLocal = this.load();
    if (inicialLocal && contarRegistrosErp(inicialLocal) > 0) {
      this.persistirLocal(inicialLocal);
      this.agendarSincronizacaoNuvem(inicialLocal, false);
    }

    // 2. Sincronização em tempo real via Cloud Firestore com mesclagem inteligente e resgate automático
    const unsubscribeFirestore = onSnapshot(
      ERP_DOC_REF,
      (snapshot) => {
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
            this.agendarSincronizacaoNuvem(mesclado, false);
          } else if (contarRegistrosErp(mesclado) > 0 && !this.hasBackedUpThisSession) {
            this.hasBackedUpThisSession = true;
            const payload = sanitizarParaFirestore(mesclado);
            setDoc(ERP_BACKUP_REF, payload).catch(() => {});
          }
        } else {
          // Caso C: Documento `erp/dados` ainda não existe na nuvem -> resgata do local ou do backup na nuvem
          void this.tentarResgatarDoBackupNuvem(local);
        }
      },
      (error) => {
        console.warn('[CONSTRUTEC] Listener do Firestore desconectado:', error);
      },
    );

    // 3. Sincronização entre abas locais via evento Storage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY || e.key === LOCAL_BACKUP_KEY || e.key === null) {
        onExternalChange();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Re-sincronizar automaticamente quando o celular/navegador reconectar à internet ou voltar ao foco (iOS/iPadOS Safari e PWA)
    const handleOnlineOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const atual = this.load();
      if (atual && possuiEstadoSincronizavelErp(atual)) {
        this.agendarSincronizacaoNuvem(atual, false);
      }
    };
    window.addEventListener('online', handleOnlineOrVisible);
    window.addEventListener('focus', handleOnlineOrVisible);
    window.addEventListener('pageshow', handleOnlineOrVisible);
    document.addEventListener('visibilitychange', handleOnlineOrVisible);

    return () => {
      this.listeners.delete(onExternalChange);
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnlineOrVisible);
      window.removeEventListener('focus', handleOnlineOrVisible);
      window.removeEventListener('pageshow', handleOnlineOrVisible);
      document.removeEventListener('visibilitychange', handleOnlineOrVisible);
    };
  }
}

export const repository: ErpRepository = new FirestoreRepository();
