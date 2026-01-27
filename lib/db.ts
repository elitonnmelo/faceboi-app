import Dexie, { Table } from 'dexie';

// Interface para Animais (já existia)
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
  criado_em: number;
}

// NOVA Interface para Eventos (Pesagem, Vacina, etc)
export interface EventoOffline {
  id?: number;
  animal_id: number;
  user_id: string;
  tipo: string;
  valor: number | null;
  custo: number | null;
  descricao: string;
  data: string;
  criado_em: number;
}

class MeuBancoLocal extends Dexie {
  animaisPendentes!: Table<AnimalOffline>;
  eventosPendentes!: Table<EventoOffline>; // <--- NOVA TABELA

  constructor() {
    super('FaceBoiOfflineDB');
    this.version(2).stores({ // <--- MUDAMOS PARA VERSÃO 2
      animaisPendentes: '++id, user_id, criado_em',
      eventosPendentes: '++id, animal_id, criado_em' // <--- Nova estrutura
    });
  }
}

export const db = new MeuBancoLocal();