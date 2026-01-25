'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DetalhesAnimal({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const idDoAnimal = Number(unwrappedParams.id);

  // Estados de Dados
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

  // 1. CARREGAR DADOS DA NUVEM
  const carregarDados = async () => {
    try {
      const { data: animalData, error: animalError } = await supabase
        .from('animais')
        .select('*')
        .eq('id', idDoAnimal)
        .single();
      
      if (animalError) throw animalError;
      setAnimal(animalData);

      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('animal_id', idDoAnimal) // Nota: animal_id com underline
        .order('data', { ascending: true });

      if (eventosError) throw eventosError;
      setEventos(eventosData || []);

    } catch (error) {
      console.error(error);
      alert('Erro ao carregar detalhes.');
      router.push('/rebanho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [idDoAnimal]);


  // PREPARAR GRÁFICO (Adaptado para estrutura do Supabase)
  const dadosGrafico = eventos
    ?.filter(e => e.tipo === 'pesagem' || (e.tipo === 'observacao' && e.descricao && e.descricao.includes('registrad')))
    .map(e => ({
      data: new Date(e.data).toLocaleDateString().slice(0, 5),
      peso: e.valor || (e.descricao.includes('registrad') ? animal?.peso_atual : 0)
    }));
  
  const custoTotal = (animal?.custo_aquisicao || 0) + (eventos?.reduce((acc, e) => acc + (e.custo || 0), 0) || 0);
  
  // Cálculo de Lucro
  const lucro = animal?.valor_venda ? (animal.valor_venda - custoTotal) : 0;

  // FUNÇÕES DE AÇÃO

  const atualizarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (animal?.status === 'vendido') return alert('Animal vendido não pode ser alterado.');
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Atualiza no Supabase
        await supabase
          .from('animais')
          .update({ foto: reader.result as string })
          .eq('id', idDoAnimal);
        
        // Atualiza na tela localmente
        setAnimal({ ...animal, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  async function realizarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!precoVenda) return alert('Informe o valor da venda');
    if(!confirm('Confirmar a venda?')) return;

    const { data: { user } } = await supabase.auth.getUser();

    // Atualiza status do boi
    await supabase.from('animais').update({
        status: 'vendido',
        valor_venda: Number(precoVenda)
    }).eq('id', idDoAnimal);

    // Registra evento de venda
    await supabase.from('eventos').insert([{
        user_id: user?.id,
        animal_id: idDoAnimal,
        tipo: 'observacao',
        descricao: `Vendido por R$ ${Number(precoVenda).toFixed(2)}`,
        data: new Date().toISOString()
    }]);

    setModalVenda(false);
    carregarDados(); // Recarrega para mostrar o lucro
  }

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

    // Salva evento na nuvem
    await supabase.from('eventos').insert([{
      user_id: user?.id,
      animal_id: idDoAnimal,
      tipo: tipoEvento,
      descricao: descricaoFinal,
      data: new Date().toISOString(),
      valor: valorFinal,
      custo: custoFinal
    }]);

    // Se for pesagem, atualiza o peso atual do boi
    if (tipoEvento === 'pesagem' && valorFinal) {
      await supabase
        .from('animais')
        .update({ peso_atual: valorFinal })
        .eq('id', idDoAnimal);
    }

    setNovoEvento('');
    setValorInput('');
    setTipoEvento('observacao');
    carregarDados(); // Recarrega a tela
  }

  if (loading || !animal) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando detalhes...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* MODAL VENDA */}
      {modalVenda && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Vender Animal</h2>
                <p className="text-sm text-gray-500 mb-4">Valor final da venda:</p>
                <form onSubmit={realizarVenda}>
                    <input 
                        type="number" autoFocus value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} 
                        className="w-full p-4 text-2xl font-bold text-green-700 border-2 border-green-500 rounded-xl mb-4 outline-none placeholder-green-200" 
                        placeholder="R$ 0,00"
                    />
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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 text-4xl font-black uppercase tracking-widest rotate-[-15deg] opacity-80 z-20 bg-white/10 backdrop-blur-sm rounded-lg">
                VENDIDO
            </div>
        )}

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-5 pt-20 pointer-events-none">
            <div className="flex justify-between items-end mb-1">
                <h1 className="text-4xl font-bold text-white drop-shadow-md">Brinco {animal.brinco}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${animal.sexo === 'Femea' ? 'bg-pink-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {animal.sexo?.toUpperCase() || 'MACHO'}
                </span>
            </div>
            <p className="text-white/90 text-lg font-medium mb-3 drop-shadow-sm">{animal.raca} • {animal.tipo}</p>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 border-t border-gray-600 pt-3">
                <div>
                    <span className="block text-xs uppercase text-gray-500">{animal.origem === 'nascido' ? 'Nascimento' : 'Aquisição'}</span>
                    <span className="text-white font-bold">{new Date(animal.data_entrada).toLocaleDateString()}</span>
                </div>
                {animal.origem === 'nascido' ? (
                    <div>
                        <span className="block text-xs uppercase text-gray-500">Filiação</span>
                        <div className="text-white text-xs">Pai: <strong>{animal.pai || '?'}</strong> • Mãe: <strong>{animal.mae || '?'}</strong></div>
                    </div>
                ) : (
                    <div>
                        <span className="block text-xs uppercase text-gray-500">Origem</span>
                        <span className="text-white font-bold">Compra Externa</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* CARD FINANCEIRO */}
        {animal.status === 'vendido' ? (
            <div className={`p-5 rounded-2xl shadow-md text-center border-2 ${lucro >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Resultado Financeiro</p>
                <p className={`text-4xl font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {lucro >= 0 ? '+' : ''} R$ {lucro.toFixed(2)}
                </p>
                <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Investido: R$ {custoTotal.toFixed(2)}</span>
                    <span>Venda: R$ {animal.valor_venda?.toFixed(2)}</span>
                </div>
            </div>
        ) : (
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
        )}

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
            <button 
                onClick={() => setModalVenda(true)}
                className="w-full py-4 bg-green-100 text-green-800 font-bold rounded-xl border-2 border-green-200 hover:bg-green-200 transition flex items-center justify-center gap-2"
            >
                <span>💰</span> Registrar Venda
            </button>
        )}

        {/* REGISTRO DE EVENTOS */}
        {animal.status === 'ativo' && (
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">Novo Evento</h3>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {['observacao', 'vacina', 'medicamento', 'pesagem'].map(t => (
                        <button key={t} onClick={() => setTipoEvento(t)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tipoEvento === t ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {tipoEvento === 'pesagem' ? (
                        <input type="number" placeholder="Kg" value={valorInput} onChange={e => setValorInput(e.target.value)} className="w-24 p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 font-bold outline-none focus:border-green-500" />
                    ) : (tipoEvento === 'vacina' || tipoEvento === 'medicamento') && (
                        <input type="number" placeholder="R$ Custo" value={valorInput} onChange={e => setValorInput(e.target.value)} className="w-24 p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 font-bold outline-none focus:border-green-500" />
                    )}
                    <input type="text" placeholder="Descrição..." value={novoEvento} onChange={e => setNovoEvento(e.target.value)} className="flex-1 p-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 outline-none focus:border-green-500" />
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
                        {ev.custo && <div className="text-red-600 font-bold text-xs">- R$ {ev.custo}</div>}
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}