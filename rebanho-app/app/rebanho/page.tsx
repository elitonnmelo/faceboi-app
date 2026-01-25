'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MeuRebanho() {
  const router = useRouter();
  const [animais, setAnimais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // 1. CARREGAR DADOS DA NUVEM
  useEffect(() => {
    const carregarRebanho = async () => {
      setLoading(true);
      
      // Verifica usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Busca no Supabase
      const { data, error } = await supabase
        .from('animais')
        .select('*')
        .eq('status', 'ativo') // Apenas ativos
        .eq('user_id', user.id) // Apenas do meu usuário (segurança extra)
        .order('created_at', { ascending: false }); // Mais recentes primeiro

      if (error) {
        console.error('Erro ao buscar:', error);
      } else {
        setAnimais(data || []);
      }
      setLoading(false);
    };

    carregarRebanho();
  }, [router]);

  // Função para Deletar (Agora na Nuvem)
  async function deletar(id: number) {
    if (!confirm('Tem certeza que quer apagar este animal da nuvem?')) return;

    const { error } = await supabase
      .from('animais')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao deletar');
    } else {
      // Remove da lista local para não precisar recarregar a tela
      setAnimais(animais.filter(boi => boi.id !== id));
    }
  }

  // Filtros Locais (Busca)
  const listaFiltrada = animais.filter(boi => 
    boi.brinco.toLowerCase().includes(busca.toLowerCase()) || 
    (boi.raca && boi.raca.toLowerCase().includes(busca.toLowerCase())) ||
    (boi.tipo && boi.tipo.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalCabecas = listaFiltrada.length;
  const pesoTotal = listaFiltrada.reduce((acc, boi) => acc + (boi.peso_atual || 0), 0);
  const totalArrobas = (pesoTotal / 30).toFixed(1);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando rebanho da nuvem... ☁️</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20">
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🐂 Meu Rebanho (Nuvem)</h1>
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
        placeholder="🔍 Buscar na lista..." 
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full p-3 rounded-xl border border-gray-200 shadow-sm outline-none text-gray-700 bg-white mb-4 focus:ring-2 focus:ring-green-500"
      />

      <div className="space-y-3">
        {listaFiltrada.map((boi) => (
            <Link href={`/animal/${boi.id}`} key={boi.id}>
              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 border border-gray-100 hover:border-green-500 transition">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white overflow-hidden border-2 flex-shrink-0 ${boi.status === 'ativo' ? 'border-green-500' : 'border-red-400'}`}>
                    {boi.foto ? <img src={boi.foto} className="w-full h-full object-cover" /> : <span className="text-gray-700 bg-gray-200 w-full h-full flex items-center justify-center">{boi.brinco.substring(0, 2)}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-lg text-gray-800 leading-none">Brinco {boi.brinco}</p>
                        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm">{boi.peso_atual} kg</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        <span className="uppercase font-bold text-green-700 mr-2">{boi.tipo}</span>
                        {boi.raca}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); deletar(boi.id); }} 
                    className="text-gray-300 hover:text-red-500 p-2"
                  >
                    🗑️
                  </button>
              </div>
            </Link>
        ))}
        {listaFiltrada.length === 0 && <p className="text-center text-gray-400 mt-10">Nenhum animal encontrado na nuvem.</p>}
      </div>
    </div>
  );
}