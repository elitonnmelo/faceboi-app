'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db'; // Importa o banco local
import { supabase } from '@/lib/supabase';

export default function StatusConexao() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  // Verifica quantos animais estão pendentes no celular
  const checkPendentes = async () => {
    const total = await db.animaisPendentes.count();
    setPendentes(total);
  };

  // Função que sobe os dados
  const sincronizarAgora = async () => {
    if (sincronizando || pendentes === 0) return;
    setSincronizando(true);

    const animais = await db.animaisPendentes.toArray();

    for (const boi of animais) {
      // 1. Remove o ID local (o Supabase cria um novo)
      const { id, criado_em, ...dadosParaEnviar } = boi;

      // 2. Envia para a nuvem
      const { error } = await supabase.from('animais').insert([dadosParaEnviar]);

      // 3. Se deu certo, apaga do celular
      if (!error) {
        await db.animaisPendentes.delete(boi.id!);
      }
    }

    await checkPendentes();
    setSincronizando(false);
    // Recarrega a página se estiver no dashboard para mostrar os novos bois
    if (window.location.pathname === '/') {
        window.location.reload();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checkPendentes();

      const goOnline = () => {
        setIsOnline(true);
        console.log("Internet voltou! Tentando sincronizar...");
        sincronizarAgora(); // Tenta sincronizar assim que volta
      };

      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      
      // Checa pendentes a cada 5 segundos se estiver online
      const intervalo = setInterval(() => {
        if (navigator.onLine) checkPendentes();
      }, 5000);

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
        clearInterval(intervalo);
      };
    }
  }, []);

  // SE ESTIVER OFFLINE
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest">
        Você está Offline 📴 - {pendentes > 0 ? `${pendentes} animal(is) salvo(s) no celular` : 'Modo Leitura'}
      </div>
    );
  }

  // SE ESTIVER ONLINE MAS TIVER COISA PENDENTE
  if (isOnline && pendentes > 0) {
    return (
      <div 
        onClick={sincronizarAgora}
        className="fixed top-0 left-0 w-full bg-yellow-500 text-black text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest cursor-pointer hover:bg-yellow-400"
      >
        {sincronizando ? '🔄 Enviando dados para a nuvem...' : `⚠️ ${pendentes} cadastro(s) pendente(s). Clique para Sincronizar!`}
      </div>
    );
  }

  return null;
}