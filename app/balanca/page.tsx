'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Pesagem {
  id?: string;
  rfid: string;
  peso: number;
  data_hora: string;
}

export default function BalancaPage() {
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBalanca, setStatusBalanca] = useState<'operante' | 'ociosa' | 'offline'>('offline');
  const [pesagensHoje, setPesagensHoje] = useState(0);

  useEffect(() => {
    buscarDadosDaBalanca();
  }, []);

  const buscarDadosDaBalanca = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('pesagens')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao buscar pesagens:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setPesagens(data);
      calcularStatusEStats(data);
    }
    
    setLoading(false);
  };

  const calcularStatusEStats = (dados: Pesagem[]) => {
    if (dados.length === 0) return;

    const ultimaPesagem = new Date(dados[0].data_hora);
    const agora = new Date();
    
    const diffMilissegundos = agora.getTime() - ultimaPesagem.getTime();
    const diffHoras = diffMilissegundos / (1000 * 60 * 60);

    if (diffHoras < 2) {
      setStatusBalanca('operante');
    } else if (diffHoras < 24) {
      setStatusBalanca('ociosa');
    } else {
      setStatusBalanca('offline');
    }

    const hojeString = agora.toISOString().split('T')[0];
    const qtdHoje = dados.filter(p => p.data_hora.startsWith(hojeString)).length;
    setPesagensHoje(qtdHoje);
  };

  return (
    // Removido o ml-72 e adicionado pt-20 para o botão do menu e p-4/md:p-8 para responsividade
    <div className="min-h-screen bg-gray-50 pt-20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho Responsivo */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">⚖️</span> Balança Smart
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitoramento de hardware e telemetria do curral.
            </p>
          </div>
          <button 
            onClick={buscarDadosDaBalanca}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 sm:py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            Atualizar Dados
          </button>
        </div>

        {/* Grid de Cards de Status (Empilha no mobile, 3 colunas no PC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          
          {/* Card 1: Status Conexão Duplo */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Rede & Hardware</p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📡</span>
                  <span className="text-sm font-semibold text-gray-700">Gateway (Sede)</span>
                </div>
                <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-md border border-green-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Online
                </span>
              </div>

              <div className="h-px bg-gray-100 w-full"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔋</span>
                  <span className="text-sm font-semibold text-gray-700">Balança (Curral)</span>
                </div>
                {statusBalanca === 'operante' && (
                  <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-md border border-green-200">Operante</span>
                )}
                {statusBalanca === 'ociosa' && (
                  <span className="bg-yellow-50 text-yellow-600 text-xs font-bold px-2 py-1 rounded-md border border-yellow-200">Ociosa</span>
                )}
                {statusBalanca === 'offline' && (
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md border border-red-200">Offline</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Último Peso */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Última Leitura</p>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-black text-gray-800">
                {pesagens.length > 0 ? pesagens[0].peso.toFixed(1) : '--'}
              </h2>
              <span className="text-lg font-bold text-gray-400 mb-1">kg</span>
            </div>
            {pesagens.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-1.5 rounded inline-block w-fit border border-gray-100 truncate max-w-full">
                RFID: {pesagens[0].rfid.substring(0, 14)}...
              </p>
            )}
          </div>

          {/* Card 3: Atividade Diária */}
          <div className="bg-[#111827] rounded-xl p-5 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tráfego Hoje</p>
            <div className="flex items-end gap-3">
              <h2 className="text-4xl font-black text-white">{pesagensHoje}</h2>
              <span className="text-sm font-medium text-green-500 mb-1">animais pesados</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Dados salvos automaticamente na nuvem.
            </p>
          </div>

        </div>

        {/* Lista de Histórico */}
        <h3 className="text-lg font-bold text-gray-800 mb-4">Últimas 20 Pesagens</h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          
          {loading ? (
            <div className="p-8 text-center text-gray-400 font-medium">Sincronizando com o Gateway...</div>
          ) : pesagens.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-medium">Nenhum animal passou pela balança ainda.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pesagens.map((pesagem, index) => (
                <div key={index} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <div className="min-w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-lg border border-blue-100 hidden sm:flex">
                      🏷️
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-800 font-mono truncate">{pesagem.rfid}</p>
                      <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">
                        {new Date(pesagem.data_hora).toLocaleDateString('pt-BR')} às {new Date(pesagem.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-md border border-gray-200 whitespace-nowrap ml-2">
                    {pesagem.peso.toFixed(1)} kg
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}