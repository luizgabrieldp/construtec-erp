import type { ErpData } from '@/domain/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface ErpRepository {
  load(): ErpData | null;
  save(data: ErpData): void;
  clear(): void;
  /** Notifica quando os dados mudam em tempo real (Firestore na nuvem ou outra aba) */
  subscribe(onExternalChange: () => void): () => void;
}

const LOCAL_KEY = 'construtec:data';
const ERP_DOC_REF = doc(db, 'erp', 'dados');

class FirestoreRepository implements ErpRepository {
  private isSavingRemote = false;

  load(): ErpData | null {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as ErpData) : null;
    } catch {
      return null;
    }
  }

  save(data: ErpData): void {
    // 1. Gravação local instantânea (para performance e suporte offline)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[CONSTRUTEC] Falha ao salvar no cache local:', e);
    }

    // 2. Sincronização em nuvem com o Cloud Firestore
    this.isSavingRemote = true;
    // O Firestore rejeita propriedades com valor `undefined`, JSON.parse(JSON.stringify) limpa essas chaves
    const sanitizedData = JSON.parse(JSON.stringify(data));

    setDoc(ERP_DOC_REF, sanitizedData)
      .then(() => {
        // Sucesso ao sincronizar na nuvem
      })
      .catch((err) => {
        console.warn('[CONSTRUTEC] Sincronização em nuvem pendente/offline:', err);
      })
      .finally(() => {
        setTimeout(() => {
          this.isSavingRemote = false;
        }, 500);
      });
  }

  clear(): void {
    localStorage.removeItem(LOCAL_KEY);
  }

  subscribe(onExternalChange: () => void): () => void {
    // 1. Sincronização em tempo real via Cloud Firestore
    const unsubscribeFirestore = onSnapshot(
      ERP_DOC_REF,
      (snapshot) => {
        if (this.isSavingRemote) {
          // Ignora o eco imediato da própria gravação local
          return;
        }

        if (snapshot.exists()) {
          const dadosNuvem = snapshot.data() as ErpData;
          try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(dadosNuvem));
          } catch {}
          onExternalChange();
        } else {
          // Se o banco na nuvem ainda estiver vazio no primeiro acesso, envia os dados locais iniciais
          const local = this.load();
          if (local) {
            setDoc(ERP_DOC_REF, JSON.parse(JSON.stringify(local))).catch(() => {});
          }
        }
      },
      (error) => {
        console.warn('[CONSTRUTEC] Listener do Firestore desconectado:', error);
      }
    );

    // 2. Sincronização entre abas locais via evento Storage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY || e.key === null) onExternalChange();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorage);
    };
  }
}

export const repository: ErpRepository = new FirestoreRepository();
