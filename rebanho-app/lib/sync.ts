import { supabase } from './supabase';
import { dbLocal } from './db';

export async function processarFilaSincronizacao() {
  // 1. Verifica se há internet
  if (!navigator.onLine) return;

  // 2. Busca itens pendentes no banco local
  const pendentes = await dbLocal.fila_sincronizacao
    .where('status')
    .equals('pendente')
    .toArray();

  if (pendentes.length === 0) return;

  console.log(`☁️ Sincronizando ${pendentes.length} itens...`);

  for (const item of pendentes) {
    try {
      const { error } = await supabase
        .from(item.tabela)
        .insert(item.dados);

      if (!error) {
        // Se deu certo, remove da fila local
        await dbLocal.fila_sincronizacao.delete(item.id!);
      }
    } catch (err) {
      console.error("Erro ao sincronizar item:", err);
    }
  }
}

// Escuta quando a internet volta
if (typeof window !== 'undefined') {
  window.addEventListener('online', processarFilaSincronizacao);
}