import Dexie, { Table } from 'dexie';

// Define o formato do dado que será salvo offline
export interface AnimalOffline {
  id?: number;
  user_id: string;
  brinco: string;
  raca: string;
  peso_atual: number;
  sexo: string;
  tipo: string;
  origem: string;
  data_entrada: string;
  custo_aquisicao: number;
  pai: string | null;
  mae: string | null;
  foto: string | null; // Salva o Base64 da foto
  criado_em: number; // Para ordenar
}

class MeuBancoLocal extends Dexie {
  animaisPendentes!: Table<AnimalOffline>;

  constructor() {
    super('FaceBoiOfflineDB');
    this.version(1).stores({
      animaisPendentes: '++id, user_id, criado_em' // Índices para busca rápida
    });
  }
}

export const db = new MeuBancoLocal();