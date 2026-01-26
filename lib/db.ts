import Dexie, { Table } from 'dexie';

export interface ItemFila {
  id?: number;
  tabela: 'animais' | 'eventos';
  dados: any;
  status: 'pendente' | 'erro';
}

export class MeuBanco extends Dexie {
  fila_sincronizacao!: Table<ItemFila>;

  constructor() {
    super('FaceBoiOffline');
    this.version(1).stores({
      fila_sincronizacao: '++id, status' // Indexamos o status para busca rápida
    });
  }
}

export const dbLocal = new MeuBanco();