'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db'; // <--- Importamos o banco local
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DetalhesAnimal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const idDoAnimal = Number(params.id);

  // Estados
  const [animal, setAnimal] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Formulário
  const [novoEvento, setNovoEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('observacao');
  const [valorInput, setValorInput] = useState('');
  
  // Estados Visuais
  const [verFoto, setVerFoto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [precoVenda, setPrecoVenda] = useState('');

  const carregarDados = async () => {
    try {
      // 1. Carrega Animal
      const { data: animalData, error: animalError } = await supabase
        .from('animais').select('*').eq('id', idDoAnimal).single();
      
      if (animalError) throw animalError;
      setAnimal(animalData);

      // 2. Carrega Eventos da Nuvem
      const { data: eventosNuvem } = await supabase
        .from('eventos').select('*').eq('animal_id', idDoAnimal).order('data', { ascending: true });

      setEventos(eventosNuvem || []);

    } catch (error) {
      console.error(error);
      // Se der erro ao carregar (offline), tenta mostrar o que tem cacheado ou avisa
      alert('Modo Offline: Algumas informações podem estar desatualizadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idDoAnimal) carregarDados();
  }, [idDoAnimal]);


  // PREPARAR GRÁFICO
  const dadosGrafico = eventos
    ?.filter(e => e.tipo === 'pesagem')
    .map(e => ({
      data: new Date(e.data).toLocaleDateString().slice(0, 5),
      peso: e.valor
    }));
  
  const custoTotal = (animal?.custo_aquisicao || 0) + (eventos?.reduce((acc, e) => acc + (e.custo || 0), 0) || 0);
  const lucro = animal?.valor_venda ? (animal.valor_venda - custoTotal) : 0;

  // --- FUNÇÃO INTELIGENTE DE SALVAR EVENTOS ---
  async function adicionarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (animal?.status === 'vendido') return;

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

    const { data: { user } } = await supabase.auth.getUser();

    const novoObjetoEvento = {
      user_id: user?.id,
      animal_id: idDoAnimal,
      tipo: tipoEvento,
      descricao: descricaoFinal,
      data: new Date().toISOString(),
      valor: valorFinal,
      custo: custoFinal
    };

    try {
        // 1. Tenta salvar na Nuvem
        const { error } = await supabase.from('eventos').insert([novoObjetoEvento]);
        if (error) throw error;

        // Se for pesagem e estiver online, atualiza o animal também
        if (tipoEvento === 'pesagem' && valorFinal) {
            await supabase.from('animais').update({ peso_atual: valorFinal }).eq('id', idDoAnimal);
        }

        alert('Salvo na nuvem! ☁️');
        carregarDados(); // Recarrega tela
    } catch (error) {
        // 2. Se falhar (Sem Internet), salva no Celular
        console.log("Offline. Salvando evento localmente...");
        
        await db.eventosPendentes.add({
            ...novoObjetoEvento,
            user_id: user?.id || 'offline',
            criado_em: Date.now()
        });

        alert('Sem internet! Evento salvo no CELULAR 📱. Será sincronizado depois.');
        
        // Atualiza a tela visualmente para o usuário não achar que travou
        setEventos([...eventos, { ...novoObjetoEvento, id: 'temp-' + Date.now() }]);
        if(valorFinal) setAnimal({...animal, peso_atual: valorFinal});
    }

    setNovoEvento('');
    setValorInput('');
    setTipoEvento('observacao');
  }

  // Ações de Foto e Venda (Mantidas simples)
  const atualizarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await supabase.from('animais').update({ foto: reader.result as string }).eq('id', idDoAnimal);
        setAnimal({ ...animal, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  async function realizarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!precoVenda || !confirm('Confirmar a venda?')) return;
    
    // Venda é algo crítico, melhor exigir internet por enquanto ou implementar lógica complexa
    try {
        await supabase.from('animais').update({ status: 'vendido', valor_venda: Number(precoVenda) }).eq('id', idDoAnimal);
        alert("Venda realizada!");
        carregarDados();
        setModalVenda(false);
    } catch (e) {
        alert("Para vender (mudar status), você precisa de internet no momento.");
    }
  }

  if (loading || !animal) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando ficha...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* MODAL VENDA */}
      {modalVenda && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Vender Animal</h2>
                <form onSubmit={realizarVenda}>
                    <input type="number" autoFocus value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} className="w-full p-4 text-2xl font-bold text-green-700 border-2 border-green-500 rounded-xl mb-4 outline-none" placeholder="R$ 0,00" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setModalVenda(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* ZOOM FOTO */}
      {verFoto && animal.foto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 cursor-pointer backdrop-blur-sm" onClick={() => setVerFoto(false)}>
            <img src={animal.foto} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="relative h-72 bg-gray-900 group">
        {animal.foto ? (
            <img src={animal.foto} onClick={() => setVerFoto(true)} className={`w-full h-full object-cover cursor-pointer transition duration-300 ${animal.status === 'vendido' ? 'grayscale opacity-50' : 'opacity-80 hover:opacity-100'}`} />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">🐮</div>
        )}
        
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white p-2 rounded-full shadow text-black font-bold z-10 hover:bg-gray-200">←</button>
        
        {animal.status === 'ativo' && (
            <label className="absolute top-4 right-4 bg-white p-3 rounded-full shadow cursor-pointer z-10 hover:bg-gray-200 active:scale-95 transition">
                <span className="text-xl">📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={atualizarFoto} />
            </label>
        )}

        {animal.status === 'vendido' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 text-4xl font-black uppercase tracking-widest rotate-[-15deg] opacity-80 z-20 bg-white/10 backdrop-blur-sm rounded-lg">VENDIDO</div>
        )}

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
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">📈 Evolução</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dadosGrafico}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="data" style={{ fontSize: '12px' }} />
                            <YAxis domain={['auto', 'auto']} style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{backgroundColor: 'white', color: 'black'}} />
                            <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={3} dot={{r: 4}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {/* BOTÃO DE VENDA */}
        {animal.status === 'ativo' && (
            <button onClick={() => setModalVenda(true)} className="w-full py-4 bg-green-100 text-green-800 font-bold rounded-xl border-2 border-green-200 hover:bg-green-200 transition flex items-center justify-center gap-2">
                <span>💰</span> Registrar Venda
            </button>
        )}

        {/* REGISTRO DE EVENTOS */}
        {animal.status === 'ativo' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-500/20">
                <h3 className="font-bold text-gray-700 mb-3">Novo Evento (Funciona Offline 📶)</h3>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {['observacao', 'vacina', 'medicamento', 'pesagem'].map(t => (
                        <button key={t} onClick={() => setTipoEvento(t)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tipoEvento === t ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {tipoEvento === 'pesagem' ? (
                        <input type="number" placeholder="Kg" value={valorInput} onChange={e => setValorInput(e.target.value)} className="w-24 p-2 border-2 border-gray-300 rounded-lg outline-none font-bold" />
                    ) : (tipoEvento === 'vacina' || tipoEvento === 'medicamento') && (
                        <input type="number" placeholder="R$ Custo" value={valorInput} onChange={e => setValorInput(e.target.value)} className="w-24 p-2 border-2 border-gray-300 rounded-lg outline-none font-bold" />
                    )}
                    <input type="text" placeholder="Descrição..." value={novoEvento} onChange={e => setNovoEvento(e.target.value)} className="flex-1 p-2 border-2 border-gray-300 rounded-lg outline-none" />
                    <button onClick={adicionarEvento} className="bg-green-600 text-white px-4 rounded-lg font-bold shadow hover:bg-green-700">→</button>
                </div>
            </div>
        )}

        {/* HISTÓRICO */}
        <div className="space-y-2">
            {eventos?.slice().reverse().map(ev => (
                <div key={ev.id} className="bg-white p-3 rounded-lg flex justify-between items-center text-sm shadow-sm border border-gray-100">
                    <div>
                        <span className="font-bold mr-2 text-xs uppercase text-gray-500">{ev.tipo}</span>
                        <span className="text-gray-900 font-medium">{ev.descricao}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-400 text-xs">{new Date(ev.data).toLocaleDateString()}</div>
                        {String(ev.id).startsWith('temp-') && <span className="text-[10px] bg-yellow-200 px-1 rounded font-bold text-yellow-800">PENDENTE</span>}
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}