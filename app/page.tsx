'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({ total: 0, machos: 0, femeas: 0, valor: 0 });
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    carregarPainel();
  }, []);

  const carregarPainel = async () => {
    try {
      // 1. Verifica Usuário (Seguro)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se não tiver sessão, tenta ver se tem algo no cache para não travar
        // Mas o ideal é mandar pro login
        router.push('/login');
        return;
      }

      setUsuario(session.user);

      // 2. Busca Dados (Local + Nuvem)
      // Primeiro tenta pegar do cache local (é instantâneo)
      const cacheAnimais = await db.animaisCache.toArray();
      const pendentes = await db.animaisPendentes.toArray();
      
      let listaFinal = [...cacheAnimais, ...pendentes];

      // Se o cache estiver vazio, tenta buscar na nuvem agora
      if (listaFinal.length === 0) {
          const { data, error } = await supabase
            .from('animais')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'ativo');
          
          if (!error && data) {
             listaFinal = data;
             // Aproveita e salva no cache
             db.animaisCache.bulkPut(data).catch(e => console.log("Erro ao salvar cache", e));
          }
      }

      // 3. Calcula os totais
      const total = listaFinal.length;
      const machos = listaFinal.filter(a => a.sexo === 'Macho').length;
      const femeas = listaFinal.filter(a => a.sexo === 'Femea').length;
      
      // Estima valor (Peso * R$ 10,00 o kg - Exemplo genérico ou soma custos)
      // Aqui vamos somar o custo de aquisição para simplificar
      const valor = listaFinal.reduce((acc, a) => acc + (Number(a.custo_aquisicao) || 0), 0);

      setResumo({ total, machos, femeas, valor });

    } catch (erro) {
      console.error("Erro crítico no painel:", erro);
      // O segredo: Se der erro, a gente zera os dados mas libera a tela!
      setResumo({ total: 0, machos: 0, femeas: 0, valor: 0 });
    } finally {
      // O SEGREDO 2: O setLoading(false) TEM que rodar, aconteça o que acontecer
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
        <p className="text-green-800 font-bold">Carregando sua fazenda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Olá, {usuario?.user_metadata?.full_name?.split(' ')[0] || 'Produtor'}! 👋</h1>
          <p className="text-sm text-gray-500">Bem-vindo ao FaceBoi</p>
        </div>
        <Link href="/perfil">
            <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold cursor-pointer hover:bg-green-300 transition">
                👤
            </div>
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Rebanho Total</p>
            <p className="text-3xl font-bold text-gray-900">{resumo.total}</p>
            <p className="text-xs text-green-600 mt-1">Animais ativos</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Investimento</p>
            <p className="text-xl font-bold text-gray-900">R$ {resumo.valor.toFixed(0)}</p>
            <p className="text-xs text-blue-600 mt-1">Em aquisições</p>
        </div>
      </div>

      {/* Distribuição */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <h3 className="font-bold text-gray-800 mb-4">📊 Distribuição do Rebanho</h3>
        <div className="flex items-center gap-4">
            <div className="flex-1 text-center p-3 bg-pink-50 rounded-xl">
                <p className="text-2xl font-bold text-pink-600">{resumo.femeas}</p>
                <p className="text-xs text-pink-400 font-bold uppercase">Fêmeas</p>
            </div>
            <div className="flex-1 text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{resumo.machos}</p>
                <p className="text-xs text-blue-400 font-bold uppercase">Machos</p>
            </div>
        </div>
      </div>

      {/* Menu Rápido */}
      <h3 className="font-bold text-gray-800 mb-4 px-1">Acesso Rápido</h3>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/rebanho">
            <div className="bg-green-600 p-4 rounded-2xl shadow-lg text-white hover:bg-green-700 active:scale-95 transition cursor-pointer h-32 flex flex-col justify-between">
                <span className="text-3xl">🐂</span>
                <span className="font-bold">Meu Rebanho</span>
            </div>
        </Link>
        
        <Link href="/novo">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-green-500 active:scale-95 transition cursor-pointer h-32 flex flex-col justify-between group">
                <span className="text-3xl group-hover:scale-110 transition">➕</span>
                <span className="font-bold text-gray-700 group-hover:text-green-600">Novo Animal</span>
            </div>
        </Link>

        <Link href="/configuracoes">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-500 active:scale-95 transition cursor-pointer h-24 flex items-center gap-3 group col-span-2">
                <span className="text-2xl bg-blue-100 p-2 rounded-lg">⚙️</span>
                <div>
                    <p className="font-bold text-gray-800">Backup & Dados</p>
                    <p className="text-xs text-gray-400">Salvar ou restaurar</p>
                </div>
            </div>
        </Link>
      </div>

    </div>
  );
}