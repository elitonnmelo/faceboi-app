'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DetalhesAnimal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const idRaw = params.id; 
  const isOfflineId = idRaw.startsWith('temp-');
  const idNumerico = Number(idRaw.replace('temp-', ''));

  const [animal, setAnimal] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Form
  const [novoEvento, setNovoEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('observacao');
  const [valorInput, setValorInput] = useState('');
  
  const [verFoto, setVerFoto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [precoVenda, setPrecoVenda] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      let dadosAnimal = null;
      let dadosEventos: any[] = [];

      if (isOfflineId) {
        // BUSCA NO CELULAR
        dadosAnimal = await db.animaisPendentes.get(idNumerico);
        if (dadosAnimal) {
            dadosAnimal.status = 'ativo';
            dadosAnimal.is_offline = true;
        }
      } else {
        // TENTA NUVEM
        const { data, error } = await supabase.from('animais').select('*').eq('id', idNumerico).single();
        if (!error && data) {
           dadosAnimal = data;
           const { data: evNuvem } = await supabase.from('eventos').select('*').eq('animal_id', idNumerico).order('data', { ascending: true });
           dadosEventos = evNuvem || [];
        } else {
           // FALHOU NUVEM? BUSCA NO CACHE
           dadosAnimal = await db.animaisCache.get(idNumerico);
        }
        // Busca Eventos Pendentes Locais (Mistura)
        const evOffline = await db.eventosPendentes.where('animal_id').equals(idNumerico).toArray();
        const evOfflineFormatados = evOffline.map(e => ({...e, id: `temp-${e.id}`, is_pending: true }));
        dadosEventos = [...dadosEventos, ...evOfflineFormatados];
      }

      if (!dadosAnimal) throw new Error("Animal não encontrado");
      
      setAnimal(dadosAnimal);
      setEventos(dadosEventos);

    } catch (error) {
      alert('Não foi possível carregar os detalhes.');
      router.push('/rebanho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [idRaw]);

  // --- ADICIONAR EVENTO DESTRAVADO ---
  async function adicionarEvento(e: React.FormEvent) {
    e.preventDefault();
    
    let descricaoFinal = novoEvento;
    let valorFinal: number | null = null;
    let custoFinal: number | null = null;

    if (tipoEvento === 'pesagem') {
        if (!valorInput) return alert('Informe o peso');
        valorFinal = Number(valorInput);
        descricaoFinal = `Pesou ${valorFinal} Kg`;
    }
    else if (tipoEvento === 'vacina' || tipoEvento === 'medicamento') {
        if (valorInput) custoFinal = Number(valorInput);
        if (!novoEvento) return alert('Nome é obrigatório');
    } 
    else if (!novoEvento) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'offline';

    const novoObjeto = {
      user_id: userId,
      animal_id: idNumerico,
      tipo: tipoEvento,
      descricao: descricaoFinal,
      data: new Date().toISOString(),
      valor: valorFinal,
      custo: custoFinal
    };

    try {
        if (isOfflineId) throw new Error("Animal offline"); 

        // Tenta Nuvem
        const { error } = await supabase.from('eventos').insert([novoObjeto]);
        if (error) throw error;

        if (tipoEvento === 'pesagem' && valorFinal) {
            await supabase.from('animais').update({ peso_atual: valorFinal }).eq('id', idNumerico);
        }

        alert('Evento Salvo na Nuvem! ☁️');
        carregarDados(); 
    } catch (error) {
        // Salva Offline
        await db.eventosPendentes.add({
            ...novoObjeto,
            criado_em: Date.now()
        });
        alert('Sem internet! Evento salvo no celular 📱.');
        
        // Atualiza visualmente
        setEventos([...eventos, { ...novoObjeto, id: 'temp-'+Date.now(), is_pending: true }]);
        if(valorFinal) setAnimal({...animal, peso_atual: valorFinal});
    }

    setNovoEvento('');
    setValorInput('');
    setTipoEvento('observacao');
  }

  // Cálculos
  const dadosGrafico = eventos?.filter(e => e.tipo === 'pesagem').map(e => ({ data: new Date(e.data).toLocaleDateString().slice(0, 5), peso: e.valor }));
  const custoTotal = (animal?.custo_aquisicao || 0) + (eventos?.reduce((acc, e) => acc + (e.custo || 0), 0) || 0);

  if (loading || !animal) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* CABEÇALHO */}
      <div className="relative h-72 bg-gray-900 group">
        {animal.foto ? (
            <img src={animal.foto} onClick={() => setVerFoto(true)} className="w-full h-full object-cover opacity-80" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">🐮</div>
        )}
        
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white p-2 rounded-full shadow text-black font-bold z-10">←</button>
        {animal.is_offline && <div className="absolute top-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-xs shadow-lg">PENDENTE</div>}

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-5 pt-20 pointer-events-none">
            <h1 className="text-4xl font-bold text-white drop-shadow-md">Brinco {animal.brinco}</h1>
            <p className="text-white/90 text-lg font-medium mb-3 drop-shadow-sm">{animal.raca} • {animal.tipo}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* INFO RÁPIDA */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600">
                <p className="text-xs text-gray-500 font-bold uppercase">Peso Atual</p>
                <p className="text-2xl font-bold text-gray-900">{animal.peso_atual} <span className="text-sm font-normal">kg</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-600">
                <p className="text-xs text-gray-500 font-bold uppercase">Investimento</p>
                <p className="text-2xl font-bold text-gray-900">R$ {custoTotal.toFixed(2)}</p>
            </div>
        </div>

        {/* GRÁFICO */}
        {dadosGrafico && dadosGrafico.length > 1 && (
            <div className="bg-white p-4 rounded-xl shadow-sm h-48">
                 <ResponsiveContainer width="100%" height="100%"><LineChart data={dadosGrafico}><XAxis dataKey="data" style={{ fontSize: '12px' }} /><YAxis domain={['auto', 'auto']} style={{ fontSize: '12px' }} /><Tooltip /><Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={3} dot={{r: 4}} /></LineChart></ResponsiveContainer>
            </div>
        )}

        {/* REGISTRO DE EVENTOS (DESTRAVADO) */}
        {animal.status === 'ativo' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-500/20">
                <h3 className="font-bold text-gray-700 mb-3">Novo Evento</h3>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {['observacao', 'vacina', 'medicamento', 'pesagem'].map(t => (
                        <button key={t} onClick={() => setTipoEvento(t)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tipoEvento === t ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {(tipoEvento === 'pesagem' || tipoEvento === 'vacina' || tipoEvento === 'medicamento') && (
                        <input type="number" placeholder={tipoEvento === 'pesagem' ? 'Kg' : 'R$'} value={valorInput} onChange={e => setValorInput(e.target.value)} className="w-24 p-2 border-2 border-gray-300 rounded-lg outline-none font-bold" />
                    )}
                    <input type="text" placeholder="Descrição..." value={novoEvento} onChange={e => setNovoEvento(e.target.value)} className="flex-1 p-2 border-2 border-gray-300 rounded-lg outline-none" />
                    <button onClick={adicionarEvento} className="bg-green-600 text-white px-4 rounded-lg font-bold shadow hover:bg-green-700">→</button>
                </div>
            </div>
        )}

        {/* HISTÓRICO */}
        <div className="space-y-2">
            {eventos?.slice().reverse().map(ev => (
                <div key={ev.id} className={`bg-white p-3 rounded-lg flex justify-between items-center text-sm shadow-sm border ${ev.is_pending ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'}`}>
                    <div><span className="font-bold mr-2 text-xs uppercase text-gray-500">{ev.tipo}</span><span className="text-gray-900 font-medium">{ev.descricao}</span></div>
                    <div className="text-right"><div className="text-gray-400 text-xs">{new Date(ev.data).toLocaleDateString()}</div>{ev.is_pending && <span className="text-[10px] bg-yellow-200 px-1 rounded font-bold text-yellow-800">PENDENTE</span>}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}