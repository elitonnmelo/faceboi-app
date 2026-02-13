'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Certifique-se de que o recharts está instalado
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [animais, setAnimais] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        const userId = session.user.id;

        // Busca Animais
        const { data: dadosAnimais, error: erroAnimais } = await supabase
            .from('animais')
            .select('*')
            .eq('user_id', userId);

        if (dadosAnimais) setAnimais(dadosAnimais);

        // Busca Eventos (Pesagem)
        const { data: dadosEventos, error: erroEventos } = await supabase
            .from('eventos')
            .select('*')
            .eq('tipo', 'pesagem')
            .eq('user_id', userId);

        if (dadosEventos) setEventos(dadosEventos);

      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [router]);

  const ativos = animais.filter(a => a.status === 'ativo');
  
  // Agrupando dados para o gráfico
  const contagemPorCategoria = ativos.reduce((acc: any, boi) => {
    acc[boi.tipo] = (acc[boi.tipo] || 0) + 1;
    return acc;
  }, {});

  const dataGrafico = Object.keys(contagemPorCategoria).map(key => ({
    name: key,
    value: contagemPorCategoria[key]
  }));

  const CORES = ['#16a34a', '#2563eb', '#db2777', '#ca8a04', '#9333ea', '#000000'];

  const qtdAlertas = ativos.filter(boi => {
    const pesagens = eventos
        .filter(e => e.animal_id === boi.id)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    if (!pesagens || pesagens.length < 2) return false;
    const ultima = pesagens[pesagens.length - 1];
    const penultima = pesagens[pesagens.length - 2];
    return (ultima.valor || 0) < (penultima.valor || 0);
  }).length;

  const valorEstimado = ativos.reduce((acc, boi) => acc + (boi.custo_aquisicao || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 Visão Geral</h1>
        <p className="text-gray-500 text-sm">Dados sincronizados na nuvem</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
            <span className="text-4xl mb-2">🐮</span>
            <span className="text-3xl font-bold text-gray-900">{ativos.length}</span>
            <span className="text-xs text-gray-500 font-bold uppercase">Animais Ativos</span>
        </div>

        <Link href="/atencao" className="w-full">
            <div className={`h-full p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center border-2 ${qtdAlertas > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <span className="text-4xl mb-2">{qtdAlertas > 0 ? '🚨' : '✅'}</span>
                <span className={`text-3xl font-bold ${qtdAlertas > 0 ? 'text-red-600' : 'text-green-600'}`}>{qtdAlertas}</span>
                <span className={`text-xs font-bold uppercase text-center ${qtdAlertas > 0 ? 'text-red-400' : 'text-green-400'}`}>Alertas Peso</span>
            </div>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <h3 className="font-bold text-gray-700 mb-4 text-center">Distribuição do Rebanho</h3>
        <div className="h-64 w-full relative">
            {ativos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dataGrafico}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {dataGrafico.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: 'white', borderRadius: '10px'}} />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem dados para gráfico</div>
            )}
        </div>
      </div>

      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-green-400 text-xs font-bold uppercase mb-1">Investimento em Aquisição</p>
            <p className="text-3xl font-bold">R$ {valorEstimado.toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}