'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Importa a nuvem
import { db } from '@/lib/db'; // Importa o banco local
import { useRouter } from 'next/navigation';

export default function Configuracoes() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Função de EXPORTAR (Backup da Nuvem)
  async function fazerBackup() {
    setLoading(true);
    setMsg('⏳ Baixando dados da nuvem...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado.");

      // Busca tudo do Supabase (A fonte da verdade)
      const { data: animais, error } = await supabase
        .from('animais')
        .select('*, eventos(*)') // Traz os animais E seus eventos juntos
        .eq('user_id', user.id);

      if (error) throw error;

      const dados = {
        data: new Date().toISOString(),
        origem: 'FaceBoi Cloud',
        animais: animais || []
      };

      // Cria o arquivo para download
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_faceboi_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg('✅ Backup baixado com sucesso!');
    } catch (error) {
      console.error(error);
      setMsg('❌ Erro ao gerar backup (Verifique a internet).');
    } finally {
      setLoading(false);
    }
  }

  // 2. Função de IMPORTAR (Restaurar para a Nuvem)
  async function restaurarBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!confirm('ATENÇÃO: Isso vai enviar os animais do arquivo para a sua conta na nuvem. Continuar?')) return;

    setLoading(true);
    setMsg('⏳ Lendo arquivo e enviando...');

    const leitor = new FileReader();
    
    leitor.onload = async (evento) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Login necessário.");

        const texto = evento.target?.result as string;
        const dadosJson = JSON.parse(texto);
        
        // Suporta tanto o formato novo quanto o antigo (por segurança)
        const listaAnimais = dadosJson.animais || dadosJson; 

        if (!Array.isArray(listaAnimais)) throw new Error('Formato de arquivo inválido.');

        let sucesso = 0;

        for (const boi of listaAnimais) {
            // Remove o ID antigo para criar um novo na nuvem
            const { id, eventos, ...dadosBoi } = boi;
            dadosBoi.user_id = user.id; // Garante que é seu

            // 1. Insere o Boi
            const { data: novoBoi, error: erroBoi } = await supabase
                .from('animais')
                .insert([dadosBoi])
                .select()
                .single();

            if (!erroBoi && novoBoi) {
                sucesso++;

                // 2. Insere os Eventos (se tiver)
                if (eventos && eventos.length > 0) {
                    const eventosParaSalvar = eventos.map((ev: any) => ({
                        animal_id: novoBoi.id, // Usa o NOVO ID
                        user_id: user.id,
                        tipo: ev.tipo,
                        descricao: ev.descricao,
                        data: ev.data,
                        valor: ev.valor,
                        custo: ev.custo
                    }));
                    await supabase.from('eventos').insert(eventosParaSalvar);
                }
            }
        }

        // Atualiza o cache local para você ver os dados na hora
        await db.animaisCache.clear(); // Limpa cache antigo
        
        setMsg(`✅ Pronto! ${sucesso} animais restaurados.`);
        setTimeout(() => window.location.reload(), 1500); // Recarrega para atualizar cache

      } catch (error) {
        console.error(error);
        setMsg('❌ Erro ao restaurar. Arquivo inválido ou sem internet.');
      } finally {
        setLoading(false);
      }
    };
    leitor.readAsText(arquivo);
  }

  // 3. Função de LIMPAR TUDO (Da Nuvem!)
  async function apagarTudo() {
    if (!confirm('🚨 PERIGO EXTREMO 🚨\n\nIsso vai apagar TODOS os seus dados na NUVEM.\nNão tem como desfazer.\n\nTem certeza absoluta?')) return;

    setLoading(true);
    setMsg('⏳ Apagando tudo...');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        // 1. Apaga Eventos primeiro
        await supabase.from('eventos').delete().eq('user_id', user.id);
        
        // 2. Apaga Animais
        await supabase.from('animais').delete().eq('user_id', user.id);

        // 3. Limpa Local
        await db.animaisCache.clear();
        await db.animaisPendentes.clear();
        await db.eventosPendentes.clear();

        setMsg('🗑️ Tudo apagado. Conta zerada.');
        setTimeout(() => router.push('/'), 1500);

    } catch (e) {
        setMsg('Erro ao apagar.');
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm font-bold text-gray-800">←</button>
        <h1 className="text-xl font-bold text-gray-800">Dados & Backup</h1>
      </div>

      <div className="space-y-4">
        
        {/* Cartão de Backup */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <h2 className="font-bold text-gray-800 mb-2 text-lg">💾 Baixar Dados</h2>
          <p className="text-sm text-gray-500 mb-4">
            Cria um arquivo seguro com todos os seus animais e históricos salvos na nuvem.
          </p>
          <button 
            onClick={fazerBackup}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Baixar Backup (JSON)'}
          </button>
        </div>

        {/* Cartão de Restaurar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <h2 className="font-bold text-gray-800 mb-2 text-lg">📂 Restaurar</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tem um arquivo de backup? Envie ele aqui para recuperar seus animais.
          </p>
          <label className={`block w-full cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-green-50 hover:border-green-300 transition ${loading ? 'opacity-50' : ''}`}>
            <span className="text-gray-600 font-bold">⬆️ Toque para escolher o arquivo</span>
            <input type="file" accept=".json" onChange={restaurarBackup} className="hidden" disabled={loading} />
          </label>
        </div>

        {/* Zona de Perigo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 mt-8">
          <h2 className="font-bold text-red-600 mb-2 text-lg">☠️ Zona de Perigo</h2>
          <p className="text-xs text-red-400 mb-4">Isso apaga seus dados da nuvem para sempre.</p>
          <button 
            onClick={apagarTudo}
            disabled={loading}
            className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 disabled:opacity-50"
          >
            Apagar Tudo (Resetar)
          </button>
        </div>

        {/* Mensagens de Status (Toast) */}
        {msg && (
          <div className="fixed bottom-6 left-4 right-4 bg-gray-900/90 text-white p-4 rounded-2xl shadow-2xl text-center backdrop-blur-sm border border-gray-700 z-50 animate-bounce">
            {msg}
          </div>
        )}

      </div>
    </div>
  );
}