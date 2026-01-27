import Dexie, { Table } from 'dexie';

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
  foto: string | null;
  status: string;
  criado_em?: number;
  is_offline?: boolean;
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
  is_pending?: boolean;
}

class MeuBancoLocal extends Dexie {
  animaisPendentes!: Table<AnimalOffline>;
  eventosPendentes!: Table<EventoOffline>;
  animaisCache!: Table<AnimalOffline>;

  constructor() {
    // MUDAMOS O NOME PARA GARANTIR LIMPEZA EM PRODUÇÃO
    super('FaceBoi_Producao_v1'); 
    this.version(1).stores({
      animaisPendentes: '++id, user_id, criado_em',
      eventosPendentes: '++id, animal_id, criado_em',
      animaisCache: 'id, user_id, status'
    });
  }
}

export const db = new MeuBancoLocal();