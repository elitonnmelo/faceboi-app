'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export default function StatusConexao() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendentesAnimais, setPendentesAnimais] = useState(0);
  const [pendentesEventos, setPendentesEventos] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  // Conta tudo o que está pendente
  const checkPendentes = async () => {
    const totalAnimais = await db.animaisPendentes.count();
    const totalEventos = await db.eventosPendentes.count();
    setPendentesAnimais(totalAnimais);
    setPendentesEventos(totalEventos);
  };

  const sincronizarAgora = async () => {
    if (sincronizando) return;
    if (pendentesAnimais === 0 && pendentesEventos === 0) return;
    
    setSincronizando(true);

    try {
        // 1. SINCRONIZAR NOVOS ANIMAIS (Prioridade)
        const animais = await db.animaisPendentes.toArray();
        for (const boi of animais) {
            const { id, criado_em, ...dados } = boi;
            const { error } = await supabase.from('animais').insert([dados]);
            if (!error) await db.animaisPendentes.delete(boi.id!);
        }

        // 2. SINCRONIZAR EVENTOS (Pesagens, Vacinas, etc)
        const eventos = await db.eventosPendentes.toArray();
        for (const evento of eventos) {
            const { id, criado_em, ...dados } = evento;
            
            // Salva o evento
            const { error } = await supabase.from('eventos').insert([dados]);
            
            if (!error) {
                // Se foi pesagem, atualiza o peso do boi também
                if (dados.tipo === 'pesagem' && dados.valor) {
                    await supabase.from('animais')
                        .update({ peso_atual: dados.valor })
                        .eq('id', dados.animal_id);
                }
                await db.eventosPendentes.delete(evento.id!);
            }
        }

        // Recarrega se estiver no dashboard ou lista
        if (window.location.pathname === '/' || window.location.pathname === '/rebanho') {
            window.location.reload();
        }

    } catch (e) {
        console.error("Erro na sincronização", e);
    } finally {
        await checkPendentes();
        setSincronizando(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checkPendentes();

      const goOnline = () => {
        setIsOnline(true);
        console.log("Online! Sincronizando...");
        sincronizarAgora();
      };

      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      
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

  const totalPendentes = pendentesAnimais + pendentesEventos;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest">
        Você está Offline 📴 - {totalPendentes > 0 ? `${totalPendentes} item(ns) pendente(s)` : 'Modo Leitura'}
      </div>
    );
  }

  if (isOnline && totalPendentes > 0) {
    return (
      <div onClick={sincronizarAgora} className="fixed top-0 left-0 w-full bg-yellow-500 text-black text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest cursor-pointer hover:bg-yellow-400">
        {sincronizando ? '🔄 Enviando dados para a nuvem...' : `⚠️ ${totalPendentes} dados pendentes. Clique para Sincronizar!`}
      </div>
    );
  }

  return null;
}