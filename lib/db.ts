import Dexie, { Table } from 'dexie';

// Interface para Animais
export interface AnimalOffline {
  id?: number; // ID numérico vindo do Supabase ou ID local
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
  status: string; // 'ativo' ou 'vendido'
  criado_em?: number;
  is_offline?: boolean; // Para sabermos se é pendente
}

// Interface para Eventos
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
  is_pending?: boolean;
}

class MeuBancoLocal extends Dexie {
  animaisPendentes!: Table<AnimalOffline>; // Novos criados offline
  eventosPendentes!: Table<EventoOffline>; // Eventos criados offline
  animaisCache!: Table<AnimalOffline>;     // Cópia do rebanho da nuvem (NOVO!)

  constructor() {
    super('FaceBoiOfflineDB');
    this.version(3).stores({ // <--- Versão 3
      animaisPendentes: '++id, user_id, criado_em',
      eventosPendentes: '++id, animal_id, criado_em',
      animaisCache: 'id, user_id, status' // <--- Nova Tabela
    });
  }
}

export const db = new MeuBancoLocal();