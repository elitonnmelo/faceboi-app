import Dexie, { Table } from 'dexie';

export interface AnimalOffline {
  id?: number; // O ID será gerado automaticamente
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
  foto: string | null;
  status: string;
  criado_em?: number;
}

export interface EventoOffline {
  id?: number;
  animal_id: number;
  user_id: string;
  tipo: string;
  valor: number | null;
  custo: number | null;
  descricao: string;
  data: string;
  criado_em?: number;
}

class MeuBancoLocal extends Dexie {
  animaisPendentes!: Table<AnimalOffline>; // Novos criados offline
  eventosPendentes!: Table<EventoOffline>; // Vacinas/Pesagens offline
  animaisCache!: Table<AnimalOffline>;     // Cópia dos animais da nuvem (para ver a lista offline)

  constructor() {
    super('FaceBoi_Final_v1'); // Nome novo para resetar tudo
    this.version(1).stores({
      animaisPendentes: '++id, user_id, criado_em',
      eventosPendentes: '++id, animal_id, criado_em',
      animaisCache: 'id, user_id, status' 
    });
  }
}

export const db = new MeuBancoLocal();