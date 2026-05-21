'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation'; 
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const comprimirImagem = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
    };
  });
};

export default function DetalhesAnimal() {
  const router = useRouter();
  const params = useParams(); 
  
  // CORREÇÃO: Garante que o ID seja numérico para o Supabase
  const idDoAnimal = params?.id ? Number(params.id) : 0;

  const [animal, setAnimal] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [pesagensAuto, setPesagensAuto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [novoEvento, setNovoEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('pesagem');
  const [valorInput, setValorInput] = useState('');
  
  // Visuais
  const [verFoto, setVerFoto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [precoVenda, setPrecoVenda] = useState('');

  const carregarDados = async () => {
    try {
      const { data: animalData, error: animalError } = await supabase
        .from('animais')
        .select('*')
        .eq('id', idDoAnimal)
        .single();
      
      if (animalError) throw animalError;
      setAnimal(animalData);

      const { data: eventosData } = await supabase
        .from('eventos')
        .select('*')
        .eq('animal_id', idDoAnimal)
        .order('data', { ascending: true });

      setEventos(eventosData || []);

      if (animalData.rfid) {
        const { data: pesagensData } = await supabase
          .from('pesagens')
          .select('*')
          .eq('rfid', animalData.rfid)
          .order('data_hora', { ascending: true });
        
        setPesagensAuto(pesagensData || []);
      }

    } catch (error) {
      console.error(error);
      alert('Erro ao carregar detalhes do animal.');
      router.push('/rebanho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idDoAnimal > 0) {
        carregarDados();
    }
  }, [idDoAnimal]);

  const deletarAnimal = async () => {
    const confirmacao = window.confirm(`Tem certeza que deseja EXCLUIR o animal Brinco ${animal.brinco}? Essa ação não tem volta.`);
    if (!confirmacao) return;

    try {
        await supabase.from('eventos').delete().eq('animal_id', idDoAnimal);
        const { error } = await supabase.from('animais').delete().eq('id', idDoAnimal);
        if (error) throw error;
        alert('Animal excluído com sucesso.');
        router.push('/rebanho');
    } catch (error) {
        alert('Erro ao excluir. Verifique sua conexão.');
    }
  };

  const atualizarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
          const fotoBase64 = await comprimirImagem(file);
          await supabase.from('animais').update({ foto: fotoBase64 }).eq('id', idDoAnimal);
          setAnimal({ ...animal, foto: fotoBase64 });
      } catch (error) {
          alert("Erro ao salvar foto.");
      }
    }
  };

  async function adicionarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (animal?.status === 'vendido') return;

    let descricaoFinal = novoEvento;
    let valorFinal: number | null = null;
    let custoFinal: number | null = null;
    const valorCorrigido = valorInput.replace(',', '.');

    if (tipoEvento === 'pesagem') {
        if (!valorInput) return alert('Informe o peso');
        valorFinal = Number(valorCorrigido);
        descricaoFinal = `Pesou ${valorFinal} Kg (Manual)`;
    }
    else if (tipoEvento === 'vacina' || tipoEvento === 'medicamento') {
        if (valorInput) custoFinal = Number(valorCorrigido);
        if (!novoEvento) return alert('Nome é obrigatório');
    } 
    else if (!novoEvento) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('eventos').insert([{
      user_id: user?.id,
      animal_id: idDoAnimal,
      tipo: tipoEvento,
      descricao: descricaoFinal,
      data: new Date().toISOString(),
      valor: valorFinal,
      custo: custoFinal
    }]);

    if (!error) {
        if (tipoEvento === 'pesagem' && valorFinal) {
            await supabase.from('animais').update({ peso_atual: valorFinal }).eq('id', idDoAnimal);
            setAnimal({ ...animal, peso_atual: valorFinal });
        }
        carregarDados();
        setNovoEvento('');
        setValorInput('');
    }
  }

  async function realizarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!precoVenda) return alert('Informe o valor');
    if(!confirm('Confirmar venda?')) return;

    await supabase.from('animais').update({ status: 'vendido', valor_venda: Number(precoVenda) }).eq('id', idDoAnimal);
    setModalVenda(false);
    carregarDados();
  }

  // --- IA DO GRÁFICO ---
  const dadosGrafico = [
    ...(eventos?.filter(e => e.tipo === 'pesagem').map(e => ({ dataRaw: e.data, peso: e.valor })) || []),
    ...(pesagensAuto?.map(p => ({ dataRaw: p.data_hora, peso: p.peso })) || [])
  ]
  .sort((a, b) => new Date(a.dataRaw).getTime() - new Date(b.dataRaw).getTime())
  .map(item => ({ data: new Date(item.dataRaw).toLocaleDateString().slice(0, 5), peso: item.peso }));

  const custoTotal = (animal?.custo_aquisicao || 0) + (eventos?.reduce((acc, e) => acc + (e.custo || 0), 0) || 0);

  if (loading || !animal) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando perfil...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 overflow-x-hidden w-full relative">
      
      {verFoto && animal.foto && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm" onClick={() => setVerFoto(false)}>
            <img src={animal.foto} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain animate-fade-in" />
            <button 
                onClick={(e) => { e.stopPropagation(); setVerFoto(false); }}
                className="fixed top-6 right-6 bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold backdrop-blur-md z-[10000]"
            >
                ✕
            </button>
        </div>
      )}

      {modalVenda && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Vender Animal</h2>
                <form onSubmit={realizarVenda}>
                    <input type="number" autoFocus value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} className="w-full p-4 text-2xl font-bold text-green-700 border-2 border-green-500 rounded-xl mb-4 outline-none bg-white" placeholder="R$ 0,00" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setModalVenda(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* CABEÇALHO DA FOTO */}
      <div className="relative h-72 bg-gray-900 group w-full">
        {animal.foto ? (
            <img src={animal.foto} onClick={() => setVerFoto(true)} className={`w-full h-full object-cover cursor-pointer transition duration-300 ${animal.status === 'vendido' ? 'grayscale opacity-50' : 'opacity-80 hover:opacity-100'}`} />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">🐮</div>
        )}
        
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white p-2 rounded-full shadow text-black font-bold z-10 hover:bg-gray-200">←</button>
        <button onClick={deletarAnimal} className="absolute top-4 right-4 bg-red-100 p-2 rounded-full shadow text-red-600 font-bold z-10 hover:bg-red-200 border-2 border-red-200">🗑️</button>

        {/* BADGE DA TAG RFID */}
        {animal.rfid && (
          <div className="absolute top-16 left-4 bg-black/60 backdrop-blur-sm border border-gray-500/50 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 z-10">
            <span className="text-blue-400 animate-pulse">📡</span>
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Tag Eletrônica</p>
              <p className="text-white font-mono text-xs leading-none mt-0.5">{animal.rfid.substring(0, 10)}...</p>
            </div>
          </div>
        )}

        {animal.status === 'ativo' && (
            <label className="absolute top-16 right-4 bg-white p-3 rounded-full shadow cursor-pointer z-10 hover:bg-gray-200 active:scale-95 transition">
                <span className="text-xl">📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={atualizarFoto} />
            </label>
        )}

        {animal.status === 'vendido' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 text-4xl font-black uppercase tracking-widest rotate-[-15deg] opacity-80 z-20 bg-white/10 backdrop-blur-sm rounded-lg">VENDIDO</div>
        )}

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-5 pt-10 pointer-events-none">
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
        
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600 flex flex-col justify-center">
                <p className="text-xs text-gray-500 font-bold uppercase">Peso Atual</p>
                <p className="text-2xl font-bold text-gray-900">{animal.peso_atual} <span className="text-sm font-normal text-gray-500">kg</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-600 flex flex-col justify-center">
                <p className="text-xs text-gray-500 font-bold uppercase">Investimento</p>
                <p className="text-2xl font-bold text-gray-900">R$ {custoTotal.toFixed(2)}</p>
            </div>
        </div>

        {/* GRÁFICO INTELIGENTE */}
        {dadosGrafico && dadosGrafico.length > 1 && (
            <div className="bg-white p-4 rounded-xl shadow-sm h-56 w-full overflow-hidden border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Evolução de Peso</p>
                <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="data" style={{ fontSize: '11px', fill: '#9ca3af' }} tickMargin={10} />
                        <YAxis domain={['auto', 'auto']} style={{ fontSize: '11px', fill: '#9ca3af' }} width={30} />
                        <Tooltip contentStyle={{backgroundColor: '#1f2937', color: 'white', borderRadius: '8px', border: 'none'}} />
                        <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={4} dot={{r: 4, fill: '#16a34a', strokeWidth: 2, stroke: 'white'}} activeDot={{r: 6}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )}

        {animal.status === 'ativo' && (
            <button 
                onClick={() => setModalVenda(true)}
                className="w-full py-4 bg-green-100 text-green-800 font-bold rounded-xl border-2 border-green-200 hover:bg-green-200 transition flex items-center justify-center gap-2"
            >
                <span>💰</span> Registrar Venda
            </button>
        )}

        {animal.status === 'ativo' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full">
                <h3 className="font-bold text-gray-700 mb-3">Novo Evento</h3>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 w-full custom-scrollbar">
                    {['pesagem', 'vacina', 'medicamento', 'observacao'].map(t => (
                        <button key={t} onClick={() => setTipoEvento(t)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors flex-shrink-0 border ${tipoEvento === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {(tipoEvento === 'pesagem' || tipoEvento === 'vacina' || tipoEvento === 'medicamento') && (
                        <input 
                            type="text" 
                            placeholder={tipoEvento === 'pesagem' ? 'Kg' : 'R$'} 
                            value={valorInput} 
                            onChange={e => setValorInput(e.target.value)} 
                            className="w-20 p-2 border border-gray-300 rounded-lg outline-none font-bold bg-gray-50 text-gray-900 focus:border-green-500 transition-colors" 
                        />
                    )}
                    <input 
                        type="text" 
                        placeholder="Descrição..." 
                        value={novoEvento} 
                        onChange={e => setNovoEvento(e.target.value)} 
                        className="flex-1 p-2 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-900 min-w-0 focus:border-green-500 transition-colors" 
                    />
                    <button onClick={adicionarEvento} className="bg-green-600 text-white px-4 rounded-lg font-bold shadow hover:bg-green-700 transition-colors">→</button>
                </div>
            </div>
        )}

        {/* HISTÓRICO */}
        <div className="space-y-2">
            <h3 className="font-bold text-gray-700 mb-2 pl-1">Linha do Tempo</h3>
            
            {eventos?.slice().reverse().map(ev => (
                <div key={ev.id} className="bg-white p-3 rounded-xl flex justify-between items-center text-sm shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">📝</div>
                        <div>
                            <span className="font-bold mr-2 text-xs uppercase text-gray-500 block">{ev.tipo}</span>
                            <span className="text-gray-900 font-medium">{ev.descricao}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-400 text-xs font-mono">{new Date(ev.data).toLocaleDateString()}</div>
                        {ev.custo && <div className="text-red-600 font-bold text-xs">- R$ {ev.custo}</div>}
                    </div>
                </div>
            ))}

            {pesagensAuto?.slice().reverse().map(pesagem => (
                <div key={pesagem.id} className="bg-blue-50 p-3 rounded-xl flex justify-between items-center text-sm shadow-sm border border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">📡</div>
                        <div>
                            <span className="font-bold mr-2 text-[10px] uppercase text-blue-600 block">Balança Smart</span>
                            <span className="text-blue-900 font-medium">Pesagem Automática</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-500 text-xs font-mono">{new Date(pesagem.data_hora).toLocaleDateString()}</div>
                        <div className="text-blue-700 font-black text-sm">{pesagem.peso.toFixed(1)} kg</div>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}