import Dexie, { type EntityTable } from 'dexie';

export interface Animal {
  id: number;
  brinco: string; 
  
  // Novos campos de classificação
  sexo: 'Macho' | 'Femea';
  tipo: string; // Vaca, Novilha, Touro, etc.
  
  raca: string; 
  pesoAtual: number; 
  status: 'ativo' | 'vendido' | 'morto';
  foto?: string; 
  
  // Novos campos de Origem
  origem: 'compra' | 'nascido';
  dataEntrada: string; // Serve para nascimento ou data da compra
  
  // Dados financeiros ou genealógicos (depende da origem)
  custoAquisicao?: number; 
  pai?: string;
  mae?: string;
}

export interface Evento {
  id: number;
  animalId: number;
  tipo: 'vacina' | 'pesagem' | 'medicamento' | 'observacao';
  descricao: string;
  data: string;
  valor?: number; 
  custo?: number; 
}

const db = new Dexie('RebanhoDB') as Dexie & {
  animais: EntityTable<Animal, 'id'>;
  eventos: EntityTable<Evento, 'id'>;
};

// Versão 4 com os novos campos
db.version(4).stores({
  animais: '++id, brinco, tipo, status, sexo, origem',
  eventos: '++id, animalId, tipo, data'
});

export { db };