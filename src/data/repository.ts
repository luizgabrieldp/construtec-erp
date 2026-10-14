import type { ErpData } from '@/domain/types';

/**
 * Contrato de persistência. Hoje: localStorage. Amanhã: Firebase/API —
 * basta criar outra implementação e trocar em `repository` abaixo.
 */
export interface ErpRepository {
  load(): ErpData | null;
  save(data: ErpData): void;
  clear(): void;
  /** Notifica quando os dados mudam em OUTRA aba/janela (ex.: Modo TV). */
  subscribe(onExternalChange: () => void): () => void;
}

const KEY = 'construtec:data';

class LocalStorageRepository implements ErpRepository {
  load(): ErpData | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as ErpData) : null;
    } catch {
      return null;
    }
  }

  save(data: ErpData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[CONSTRUTEC] Falha ao salvar no localStorage (limite de espaço?)', e);
    }
  }

  clear(): void {
    localStorage.removeItem(KEY);
  }

  subscribe(onExternalChange: () => void): () => void {
    // O evento "storage" só dispara nas OUTRAS abas do mesmo navegador.
    const handler = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) onExternalChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

export const repository: ErpRepository = new LocalStorageRepository();
