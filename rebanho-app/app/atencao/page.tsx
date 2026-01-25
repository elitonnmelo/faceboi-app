'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Atencao() {
  const router = useRouter();
  const [animaisAlerta, setAnimaisAlerta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarAlertas = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Busca animais ativos
      const { data: animais } = await supabase
        .from('animais')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativo');

      // 2. Busca todas as pesagens
      const { data: eventos } = await supabase
        .from('eventos')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'pesagem')
        .order('data', { ascending: true });

      if (animais && eventos) {
        const emAlerta = animais.filter(boi => {
          const pesagensDoBoi = eventos.filter(e => e.animal_id === boi.id);
          
          if (pesagensDoBoi.length < 2) return false;

          // Pega as duas últimas pesagens registradas
          const ultima = pesagensDoBoi[pesagensDoBoi.length - 1];
          const penultima = pesagensDoBoi[pesagensDoBoi.length - 2];

          // Se o peso caiu, entra no alerta
          return (ultima.valor || 0) < (penultima.valor || 0);
        });

        setAnimaisAlerta(emAlerta);
      }
      setLoading(false);
    };

    buscarAlertas();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">Analisando saúde do rebanho... 🚨</div>;

  return (
    <div className="min-h-screen bg-red-50 p-4 pt-20 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🚨</span>
        <h1 className="text-2xl font-bold text-red-700">Atenção Necessária</h1>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 mb-6">
        <p className="text-sm text-gray-600">
          Estes animais apresentaram <strong>queda de peso</strong> na última medição. Recomenda-se check-up sanitário ou reforço alimentar.
        </p>
      </div>

      <div className="space-y-3">
        {animaisAlerta.map(boi => (
           <Link href={`/animal/${boi.id}`} key={boi.id}>
             <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-red-100 active:scale-95 transition">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-xl">🐂</div>
                 <div>
                   <p className="font-bold text-lg text-gray-800">Brinco {boi.brinco}</p>
                   <p className="text-red-500 text-xs font-bold uppercase">{boi.tipo} • {boi.raca}</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-xs text-gray-400 font-bold">PESO ATUAL</p>
                 <p className="text-lg font-black text-gray-800">{boi.peso_atual} kg</p>
               </div>
             </div>
           </Link>
        ))}

        {animaisAlerta.length === 0 && (
            <div className="text-center py-20">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-green-700 font-bold">Tudo sob controle!</p>
                <p className="text-gray-500 text-sm">Nenhum animal com perda de peso detectada.</p>
            </div>
        )}
      </div>
    </div>
  );
}