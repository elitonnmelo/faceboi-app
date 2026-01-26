'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [animais, setAnimais] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);

      // 1. Verifica Usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Busca Animais e Eventos da Nuvem
      const { data: dadosAnimais } = await supabase
        .from('animais')
        .select('*')
        .eq('user_id', user.id); // Só os meus

      const { data: dadosEventos } = await supabase
        .from('eventos')
        .select('*')
        .eq('tipo', 'pesagem') // Só precisamos das pesagens para os alertas
        .eq('user_id', user.id);

      if (dadosAnimais) {
        setAnimais(dadosAnimais);
        
        // --- ROBÔ DE EVOLUÇÃO (Atualiza categorias na nuvem) ---
        const hoje = new Date();
        const listaDeMaes = new Set(
            dadosAnimais.filter((a: any) => a.mae && a.mae.trim() !== '').map((a: any) => a.mae?.toLowerCase().trim())
        );

        for (const boi of dadosAnimais) {
            if (boi.status !== 'ativo') continue;
            
            const nascimento = new Date(boi.data_entrada); // Usando data_entrada como base
            const idadeMeses = (hoje.getFullYear() - nascimento.getFullYear()) * 12 + (hoje.getMonth() - nascimento.getMonth());
            let novaCategoria = boi.tipo;

            if (boi.sexo === 'Femea') {
                const ehMae = listaDeMaes.has(boi.brinco.toLowerCase()) || (boi.raca && listaDeMaes.has(boi.raca.toLowerCase()));
                if (ehMae) novaCategoria = 'Vaca';
                else {
                    if (idadeMeses < 12) novaCategoria = 'Bezerra';
                    else if (idadeMeses < 24) novaCategoria = 'Garrota';
                    else novaCategoria = 'Novilha';
                }
            } else {
                if (boi.tipo !== 'Touro') {
                    if (idadeMeses < 12) novaCategoria = 'Bezerro';
                    else if (idadeMeses < 24) novaCategoria = 'Garrote';
                    else if (idadeMeses < 42) novaCategoria = 'Novilho';
                    else novaCategoria = 'Boi';
                }
            }

            // Se mudou, atualiza na nuvem silenciosamente
            if (novaCategoria !== boi.tipo) {
                console.log(`Evoluindo ${boi.brinco} na nuvem...`);
                await supabase.from('animais').update({ tipo: novaCategoria }).eq('id', boi.id);
            }
        }
        // -------------------------------------------------------
      }

      if (dadosEventos) setEventos(dadosEventos);
      setLoading(false);
    };

    carregarDados();
  }, [router]);

  // --- CÁLCULOS DO DASHBOARD ---

  // 1. Gráfico de Pizza (Só Ativos)
  const ativos = animais.filter(a => a.status === 'ativo');
  
  const contagemPorCategoria = ativos.reduce((acc: any, boi) => {
    acc[boi.tipo] = (acc[boi.tipo] || 0) + 1;
    return acc;
  }, {});

  const dataGrafico = Object.keys(contagemPorCategoria).map(key => ({
    name: key,
    value: contagemPorCategoria[key]
  }));

  const CORES = ['#16a34a', '#2563eb', '#db2777', '#ca8a04', '#9333ea', '#000000'];

  // 2. Alertas de Perda de Peso
  const qtdAlertas = ativos.filter(boi => {
    const pesagens = eventos
        .filter(e => e.animal_id === boi.id) // Note: animal_id com underline no Supabase
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    if (!pesagens || pesagens.length < 2) return false;
    const ultima = pesagens[pesagens.length - 1];
    const penultima = pesagens[pesagens.length - 2];
    return (ultima.valor || 0) < (penultima.valor || 0);
  }).length;

  // 3. Financeiro Estimado (Soma custo de aquisição dos ativos)
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
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Sem dados para gráfico
                </div>
            )}
            
            {ativos.length > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center">
                    <p className="text-3xl font-bold text-gray-800">{ativos.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Cabeças</p>
                </div>
            )}
        </div>
      </div>

      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-green-400 text-xs font-bold uppercase mb-1">Investimento em Aquisição</p>
            <p className="text-3xl font-bold">R$ {valorEstimado.toLocaleString('pt-BR')}</p>
            <p className="text-gray-400 text-xs mt-2">*Baseado em animais ativos na nuvem.</p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10">💰</div>
      </div>

    </div>
  );
}