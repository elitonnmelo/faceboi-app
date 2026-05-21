'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Animal {
  id: string;
  brinco: string;
  rfid?: string;
  tipo: string;
  raca: string;
  peso_atual?: number;
  data_verificacao_alerta?: string; // NOVO CAMPO
}

interface Alerta {
  animal: Animal;
  tipo: 'critico' | 'atencao' | 'sumico';
  titulo: string;
  mensagem: string;
  corFundo: string;
  corBorda: string;
  corTexto: string;
  icone: string;
}

export default function AtencaoInteligentePage() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarInteligencia();
  }, [router]);

  const buscarInteligencia = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: animais } = await supabase
      .from('animais')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativo');

    const { data: pesagens } = await supabase
      .from('pesagens')
      .select('*')
      .order('data_hora', { ascending: false });

    if (animais && pesagens) {
      const novosAlertas: Alerta[] = [];
      const agora = new Date();

      animais.forEach((boi: Animal) => {
        const chaveBusca = boi.rfid || boi.brinco;
        const historicoBoi = pesagens.filter(p => p.rfid === chaveBusca);

        if (historicoBoi.length === 0) return;

        const ultimaPesagem = historicoBoi[0];
        const dataUltima = new Date(ultimaPesagem.data_hora).getTime();
        
        // Pega a data que o produtor clicou em "Conferido" (se existir)
        const dataVerificacao = boi.data_verificacao_alerta ? new Date(boi.data_verificacao_alerta).getTime() : 0;
        
        // --- REGRA 1: ALERTA DE SUMIÇO ---
        const horasSumido = (agora.getTime() - dataUltima) / (1000 * 60 * 60);
        const dataFicouSumido = dataUltima + (48 * 60 * 60 * 1000); // Exato momento que bateu 48h
        
        // Só alerta se o boi sumiu E o produtor ainda não marcou como visto DEPOIS que ele sumiu
        if (horasSumido > 48 && dataVerificacao < dataFicouSumido) {
          const dias = Math.floor(horasSumido / 24);
          novosAlertas.push({
            animal: boi,
            tipo: 'sumico',
            titulo: 'Ausência Detectada',
            mensagem: `Animal não passa pela balança há ${dias} dias.`,
            corFundo: 'bg-orange-50',
            corBorda: 'border-orange-200',
            corTexto: 'text-orange-700',
            icone: '🕵️',
          });
        }

        // --- REGRA 2: QUEDA DE PESO ---
        if (historicoBoi.length >= 2) {
          //let penultimaReal = historicoBoi.find(p => (dataUltima - new Date(p.data_hora).getTime()) > (12 * 60 * 60 * 1000));
          //if (!penultimaReal) penultimaReal = historicoBoi[1];

          let penultimaReal = historicoBoi.find(p => (dataUltima - new Date(p.data_hora).getTime()) > (1 * 60 * 1000));
          const diferencaPeso = ultimaPesagem.peso - penultimaReal.peso;

          // Só alerta se a queda de peso for MAIS NOVA que o último "Conferido" do produtor
          if (dataVerificacao < dataUltima) {
            if (diferencaPeso <= -10) {
              novosAlertas.push({
                animal: boi,
                tipo: 'critico',
                titulo: 'Perda de Peso Severa',
                mensagem: `Caiu de ${penultimaReal.peso.toFixed(1)}kg para ${ultimaPesagem.peso.toFixed(1)}kg.`,
                corFundo: 'bg-red-50',
                corBorda: 'border-red-200',
                corTexto: 'text-red-700',
                icone: '📉',
              });
            } else if (diferencaPeso <= -2 && diferencaPeso > -10) {
              novosAlertas.push({
                animal: boi,
                tipo: 'atencao',
                titulo: 'Queda de Peso Leve',
                mensagem: `Perdeu ${Math.abs(diferencaPeso).toFixed(1)}kg desde a última avaliação.`,
                corFundo: 'bg-yellow-50',
                corBorda: 'border-yellow-200',
                corTexto: 'text-yellow-700',
                icone: '⚠️',
              });
            }
          }
        }
      });

      novosAlertas.sort((a, b) => {
        const pesos = { critico: 3, sumico: 2, atencao: 1 };
        return pesos[b.tipo] - pesos[a.tipo];
      });

      setAlertas(novosAlertas);
    }
    setLoading(false);
  };

  // --- NOVA FUNÇÃO: MARCAR COMO CONFERIDO ---
  const resolverAlerta = async (animalId: string) => {
    // 1. Atualiza a tela instantaneamente (Optimistic UI) para não fazer o usuário esperar
    setAlertas(prev => prev.filter(a => a.animal.id !== animalId));

    // 2. Manda a hora atual pro Supabase em background
    const { error } = await supabase
      .from('animais')
      .update({ data_verificacao_alerta: new Date().toISOString() })
      .eq('id', animalId);

    if (error) {
      console.error("Erro ao resolver alerta:", error);
      alert("Erro de conexão. O alerta pode voltar ao recarregar a página.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold">A IA FaceBoi está analisando seu rebanho...</p>
      </div>
    );
  }

  const qtdCriticos = alertas.filter(a => a.tipo === 'critico').length;
  const qtdSumicos = alertas.filter(a => a.tipo === 'sumico').length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🚨</span> Centro de Atenção
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Análise preditiva gerada automaticamente pelos dados da balança.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-3xl font-black text-red-600">{qtdCriticos}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mt-1">Casos Críticos</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-3xl font-black text-orange-500">{qtdSumicos}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mt-1">Sumiços do Cocho</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center col-span-2 md:col-span-1">
            <h3 className="text-3xl font-black text-gray-800">{alertas.length}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mt-1">Total de Alertas</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {alertas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-600 mb-2">Rebanho Saudável!</h2>
              <p className="text-gray-500 text-sm">A inteligência artificial não detectou perda de peso abrupta ou ausência nos animais pesados recentemente.</p>
            </div>
          ) : (
            alertas.map((alerta, index) => (
              <div key={`${alerta.animal.id}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border shadow-sm bg-white overflow-hidden relative group">
                
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${alerta.tipo === 'critico' ? 'bg-red-500' : alerta.tipo === 'sumico' ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>

                <div className="flex items-center gap-4 pl-4 sm:w-1/4">
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl ${alerta.corFundo} border ${alerta.corBorda}`}>
                    {alerta.icone}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Brinco {alerta.animal.brinco}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase">{alerta.animal.tipo} • {alerta.animal.raca}</p>
                  </div>
                </div>

                <div className={`flex-1 p-3 rounded-lg ${alerta.corFundo} ${alerta.corBorda} border`}>
                  <p className={`text-sm font-bold mb-1 ${alerta.corTexto}`}>{alerta.titulo}</p>
                  <p className="text-xs text-gray-600">{alerta.mensagem}</p>
                </div>
                
                {/* BOTÕES DE AÇÃO: O Grande Diferencial */}
                <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0 pr-2">
                  <Link href={`/rebanho/${alerta.animal.id}`} className="flex-1 sm:flex-none">
                    <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                      Ver Perfil
                    </button>
                  </Link>
                  <button 
                    onClick={() => resolverAlerta(alerta.animal.id)}
                    className="flex-1 sm:flex-none bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>✅</span> Conferido
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}