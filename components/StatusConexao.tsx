'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export default function StatusConexao() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendentesAnimais, setPendentesAnimais] = useState(0);
  const [pendentesEventos, setPendentesEventos] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const checkPendentes = async () => {
    const totalAnimais = await db.animaisPendentes.count();
    const totalEventos = await db.eventosPendentes.count();
    setPendentesAnimais(totalAnimais);
    setPendentesEventos(totalEventos);
  };

  const sincronizarAgora = async () => {
    if (sincronizando) return;
    setSincronizando(true);

    try {
        // 1. SINCRONIZAR ANIMAIS (E MAREAR ID)
        const animais = await db.animaisPendentes.toArray();
        
        for (const boi of animais) {
            const idAntigoLocal = boi.id!;
            const { id, criado_em, status, is_offline, ...dados } = boi; // Remove campos locais
            
            // Envia para nuvem
            const { data, error } = await supabase.from('animais').insert([dados]).select();
            
            if (!error && data && data[0]) {
                const novoIdNuvem = data[0].id; // O ID real gerado pelo Supabase (Ex: 555)

                // *** O PULO DO GATO: ATUALIZAR OS EVENTOS FILHOS ***
                // Procura eventos que usavam o ID local antigo
                const eventosFilhos = await db.eventosPendentes.where('animal_id').equals(idAntigoLocal).toArray();
                
                for (const ev of eventosFilhos) {
                    // Atualiza o ID do pai para o novo ID da nuvem
                    await db.eventosPendentes.update(ev.id!, { animal_id: novoIdNuvem });
                }

                // Deleta o boi pendente do celular (já subiu)
                await db.animaisPendentes.delete(idAntigoLocal);
            }
        }

        // 2. SINCRONIZAR EVENTOS (Agora com IDs corrigidos)
        const eventos = await db.eventosPendentes.toArray();
        for (const evento of eventos) {
            const { id, criado_em, is_pending, ...dados } = evento;
            
            const { error } = await supabase.from('eventos').insert([dados]);
            
            if (!error) {
                // Se foi pesagem, atualiza o animal
                if (dados.tipo === 'pesagem' && dados.valor) {
                    await supabase.from('animais').update({ peso_atual: dados.valor }).eq('id', dados.animal_id);
                }
                await db.eventosPendentes.delete(evento.id!);
            }
        }

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

      const goOnline = () => { setIsOnline(true); sincronizarAgora(); };
      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      
      const intervalo = setInterval(() => { if (navigator.onLine) checkPendentes(); }, 5000);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
        clearInterval(intervalo);
      };
    }
  }, []);

  const total = pendentesAnimais + pendentesEventos;
  if (!isOnline) return <div className="fixed top-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[9999] uppercase">Você está Offline 📴 - {total > 0 ? `${total} pendentes` : 'Modo Leitura'}</div>;
  if (isOnline && total > 0) return <div onClick={sincronizarAgora} className="fixed top-0 w-full bg-yellow-500 text-black text-[10px] font-bold py-1 text-center z-[9999] uppercase cursor-pointer">⚠️ {total} dados pendentes. Sincronizando...</div>;
  return null;
}