'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Função auxiliar para comprimir imagem
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

export default function DetalhesAnimal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const idDoAnimal = Number(params.id);

  const [animal, setAnimal] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [novoEvento, setNovoEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('pesagem');
  const [valorInput, setValorInput] = useState('');
  
  // Visuais
  const [verFoto, setVerFoto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [precoVenda, setPrecoVenda] = useState('');

  // CARREGAR DADOS
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

    } catch (error) {
      alert('Erro ao carregar detalhes.');
      router.push('/rebanho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idDoAnimal) carregarDados();
  }, [idDoAnimal]);

  // --- FUNÇÃO DELETAR (NOVA) ---
  const deletarAnimal = async () => {
    const confirmacao = window.confirm(`Tem certeza que deseja EXCLUIR o animal Brinco ${animal.brinco}? Essa ação não tem volta.`);
    if (!confirmacao) return;

    try {
        // Primeiro apaga os eventos para não dar erro de vínculo
        await supabase.from('eventos').delete().eq('animal_id', idDoAnimal);
        
        // Depois apaga o animal
        const { error } = await supabase.from('animais').delete().eq('id', idDoAnimal);
        
        if (error) throw error;

        alert('Animal excluído com sucesso.');
        router.push('/rebanho'); // Volta para a lista
    } catch (error) {
        alert('Erro ao excluir. Verifique sua conexão.');
    }
  };

  // ATUALIZAR FOTO
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

  // ADICIONAR EVENTO
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
        descricaoFinal = `Pesou ${valorFinal} Kg`;
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

  // VENDA
  async function realizarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!precoVenda) return alert('Informe o valor');
    if(!confirm('Confirmar venda?')) return;

    await supabase.from('animais').update({ status: 'vendido', valor_venda: Number(precoVenda) }).eq('id', idDoAnimal);
    setModalVenda(false);
    carregarDados();
  }

  const dadosGrafico = eventos?.filter(e => e.tipo === 'pesagem').map(e => ({ data: new Date(e.data).toLocaleDateString().slice(0, 5), peso: e.valor }));
  const custoTotal = (animal?.custo_aquisicao || 0) + (eventos?.reduce((acc, e) => acc + (e.custo || 0), 0) || 0);

  if (loading || !animal) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* ZOOM FOTO */}
      {verFoto && animal.foto && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm" onClick={() => setVerFoto(false)}>
            <img src={animal.foto} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain animate-fade-in" />
            <button className="absolute top-4 right-4 text-white text-4xl font-bold">&times;</button>
        </div>
      )}

      {/* MODAL VENDA */}
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

      {/* CABEÇALHO */}
      <div className="relative h-72 bg-gray-900 group">
        {animal.foto ? (
            <img src={animal.foto} onClick={() => setVerFoto(true)} className={`w-full h-full object-cover cursor-pointer transition duration-300 ${animal.status === 'vendido' ? 'grayscale opacity-50' : 'opacity-80 hover:opacity-100'}`} />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">🐮</div>
        )}
        
        {/* BOTÃO VOLTAR */}
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-white p-2 rounded-full shadow text-black font-bold z-10 hover:bg-gray-200">←</button>
        
        {/* BOTÃO EXCLUIR (NOVO) - Lado direito superior */}
        <button 
            onClick={deletarAnimal} 
            className="absolute top-4 right-4 bg-red-100 p-2 rounded-full shadow text-red-600 font-bold z-10 hover:bg-red-200 border-2 border-red-200"
            title="Excluir Animal"
        >
            🗑️
        </button>

        {/* BOTÃO FOTO - Um pouco mais abaixo do excluir */}
        {animal.status === 'ativo' && (
            <label className="absolute top-16 right-4 bg-white p-3 rounded-full shadow cursor-pointer z-10 hover:bg-gray-200 active:scale-95 transition">
                <span className="text-xl">📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={atualizarFoto} />
            </label>
        )}

        {animal.status === 'vendido' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 text-4xl font-black uppercase tracking-widest rotate-[-15deg] opacity-80 z-20 bg-white/10 backdrop-blur-sm rounded-lg">
                VENDIDO
            </div>
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
            <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-500/20">
                <h3 className="font-bold text-gray-700 mb-3">Novo Evento</h3>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {['pesagem', 'vacina', 'medicamento', 'observacao'].map(t => (
                        <button key={t} onClick={() => setTipoEvento(t)} className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${tipoEvento === t ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {(tipoEvento === 'pesagem' || tipoEvento === 'vacina' || tipoEvento === 'medicamento') && (
                        <input 
                            type="text" 
                            placeholder={tipoEvento === 'pesagem' ? 'Kg' : 'R$'} 
                            value={valorInput} 
                            onChange={e => setValorInput(e.target.value)} 
                            className="w-24 p-2 border-2 border-gray-300 rounded-lg outline-none font-bold bg-white text-gray-900" 
                        />
                    )}
                    <input 
                        type="text" 
                        placeholder="Descrição..." 
                        value={novoEvento} 
                        onChange={e => setNovoEvento(e.target.value)} 
                        className="flex-1 p-2 border-2 border-gray-300 rounded-lg outline-none bg-white text-gray-900" 
                    />
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