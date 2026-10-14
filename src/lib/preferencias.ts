/**
 * Preferences the visitor chose, as opposed to filters, which live in the URL.
 *
 * A preference is remembered in localStorage so it survives a reload and is
 * not carried by a shared link. Reads and writes are best-effort: private
 * mode and full quotas must never break the screen.
 */

export interface Armazenamento {
  ler(chave: string): string | null;
  gravar(chave: string, valor: string): void;
}

/** localStorage, tolerating private mode, disabled storage and full quotas. */
export class ArmazenamentoLocal implements Armazenamento {
  ler(chave: string): string | null {
    try {
      return window.localStorage.getItem(chave);
    } catch {
      return null;
    }
  }

  gravar(chave: string, valor: string): void {
    try {
      window.localStorage.setItem(chave, valor);
    } catch {
      /* storage unavailable: the preference is simply not remembered */
    }
  }
}

export class Preferencias {
  private readonly armazenamento: Armazenamento;

  constructor(armazenamento: Armazenamento = new ArmazenamentoLocal()) {
    this.armazenamento = armazenamento;
  }

  ler(chave: string, padrao: string): string {
    return this.armazenamento.ler(chave) ?? padrao;
  }

  gravar(chave: string, valor: string): void {
    this.armazenamento.gravar(chave, valor);
  }
}

export const preferencias = new Preferencias();
