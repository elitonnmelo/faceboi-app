'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MeuRebanho() {
  const router = useRouter();
  const [animais, setAnimais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modoOffline, setModoOffline] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    
    // 1. CARREGA DADOS LOCAIS PRIMEIRO (Instantâneo)
    const pendentes = await db.animaisPendentes.toArray();
    const cacheados = await db.animaisCache.toArray();
    
    // Formata os pendentes
    const pendentesFormatados = pendentes.map(a => ({
        ...a, id: `temp-${a.id}`, is_offline: true, status: 'ativo'
    }));

    // Mostra o que tem no celular imediatamente
    setAnimais([...pendentesFormatados, ...cacheados]);
    setLoading(false); // Já libera a tela para o usuário

    // 2. TENTA ATUALIZAR COM A NUVEM (Em segundo plano)
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('animais')
            .select('*')
            .eq('status', 'ativo')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setModoOffline(false);
            // Atualiza a lista visual
            setAnimais([...pendentesFormatados, ...data]);
            
            // ATUALIZA O CACHE DO CELULAR (Para a próxima vez)
            await db.animaisCache.clear(); // Limpa cache antigo
            await db.animaisCache.bulkPut(data); // Salva o novo
        }
    } catch (e) {
        console.log("Sem internet. Usando cache local.");
        setModoOffline(true);
    }
  };

  // Função Deletar
  async function deletar(id: string | number) {
    if (!confirm('Tem certeza?')) return;
    const idString = String(id);

    if (idString.startsWith('temp-')) {
        const idReal = Number(idString.replace('temp-', ''));
        await db.animaisPendentes.delete(idReal);
    } else {
        try {
            const { error } = await supabase.from('animais').delete().eq('id', id);
            if (error) throw error;
            // Remove do cache local também
            await db.animaisCache.delete(Number(id));
        } catch (e) {
            alert("Você precisa de internet para deletar animais da nuvem.");
            return;
        }
    }
    // Atualiza visualmente
    setAnimais(prev => prev.filter(boi => String(boi.id) !== idString));
  }

  // Filtros
  const listaFiltrada = animais.filter(boi => 
    boi.brinco?.toLowerCase().includes(busca.toLowerCase()) || 
    (boi.tipo && boi.tipo.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalCabecas = listaFiltrada.length;
  const pesoTotal = listaFiltrada.reduce((acc, boi) => acc + (Number(boi.peso_atual) || 0), 0);
  const totalArrobas = (pesoTotal / 30).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20">
      
      {modoOffline && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-xs text-center font-bold mb-4 rounded-lg border border-yellow-300">
            📡 Modo Offline: Mostrando dados salvos no celular
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🐂 Meu Rebanho</h1>
        <Link href="/novo">
            <button className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-800 active:scale-95 transition">
              + Novo
            </button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
             <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
             <p className="text-2xl font-bold text-gray-800">{totalCabecas}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
             <p className="text-xs font-bold text-gray-500 uppercase">Arrobas</p>
             <p className="text-2xl font-bold text-gray-800">{totalArrobas} @</p>
          </div>
      </div>
      
      <input 
        type="text" 
        placeholder="🔍 Buscar..." 
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full p-3 rounded-xl border border-gray-200 shadow-sm outline-none text-gray-700 bg-white mb-4 focus:ring-2 focus:ring-green-500"
      />

      <div className="space-y-3">
        {listaFiltrada.map((boi) => (
            <Link href={`/rebanho/${boi.id}`} key={boi.id}>
              <div className={`p-4 rounded-xl shadow-sm flex items-center gap-3 border transition ${boi.is_offline ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white overflow-hidden border-2 flex-shrink-0 ${boi.status === 'ativo' ? 'border-green-500' : 'border-red-400'}`}>
                    {boi.foto ? <img src={boi.foto} className="w-full h-full object-cover" /> : <span className="text-gray-700 bg-gray-200 w-full h-full flex items-center justify-center">{boi.brinco?.substring(0, 2)}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-lg text-gray-800 leading-none">
                            {boi.brinco} 
                            {boi.is_offline && <span className="ml-2 text-[10px] bg-yellow-500 text-black px-1 rounded">PENDENTE</span>}
                        </p>
                        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm">{boi.peso_atual} kg</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        <span className="uppercase font-bold text-green-700 mr-2">{boi.tipo}</span>
                        {boi.raca}
                    </p>
                  </div>
              </div>
            </Link>
        ))}
        {listaFiltrada.length === 0 && <p className="text-center text-gray-400 mt-10">{loading ? 'Carregando...' : 'Nenhum animal encontrado.'}</p>}
      </div>
    </div>
  );
}