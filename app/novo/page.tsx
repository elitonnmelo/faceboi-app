'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovoAnimal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // --- ESTADOS ---
  const [brinco, setBrinco] = useState('');
  const [raca, setRaca] = useState('');
  const [peso, setPeso] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  
  const [sexo, setSexo] = useState<'Macho' | 'Femea'>('Femea');
  const [tipo, setTipo] = useState('');
  const [origem, setOrigem] = useState<'compra' | 'nascido'>('compra');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);

  const [custo, setCusto] = useState('');
  const [pai, setPai] = useState('');
  const [mae, setMae] = useState('');
  const [carregando, setCarregando] = useState(false);

  // --- LISTAS ---
  const catFemea = ['Bezerra', 'Garrota', 'Novilha', 'Vaca'];
  const catMacho = ['Bezerro', 'Garrote', 'Novilho', 'Boi', 'Touro'];

  // 1. VERIFICAR SE ESTÁ LOGADO AO ENTRAR
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Chuta pro login se não tiver usuário
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

  // Atualiza categoria automática
  useEffect(() => {
    if (sexo === 'Femea') setTipo(catFemea[0]);
    else setTipo(catMacho[0]);
  }, [sexo]);

  const processarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // 1. Criamos um "palco" (canvas) invisível
          const canvas = document.createElement('canvas');
          
          // 2. Definimos o tamanho máximo (ex: 600px de largura)
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // 3. Desenhamos a imagem no "palco" menor
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 4. Transformamos em texto (Base64) com qualidade reduzida (0.7 = 70%)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setFoto(dataUrl);
          console.log("Foto comprimida com sucesso!");
        };
      };
    }
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCarregando(true);

    const dadosAnimal = {
        user_id: user.id,
        brinco,
        raca: raca || 'Mestiço',
        peso_atual: Number(peso),
        sexo,
        tipo,
        origem,
        data_entrada: new Date(dataEntrada).toISOString(),
        foto
    };

    try {
        // Tenta salvar direto no Supabase
        const { error } = await supabase.from('animais').insert([dadosAnimal]);

        if (error) throw error; // Se falhar (ex: sem internet), cai no catch

        alert('Salvo na nuvem! ☁️');
        router.push('/');
    } catch (erro) {
        // SE DER ERRO (Sem internet), SALVA NA FILA LOCAL
        await dbLocal.fila_sincronizacao.add({
        tabela: 'animais',
        dados: dadosAnimal,
        status: 'pendente'
        });

        alert('Você está sem internet. O boi foi salvo no celular e será enviado para a nuvem assim que o sinal voltar! 📶✅');
        router.push('/');
    } finally {
        setCarregando(false);
    }
    }

  const inputStyle = "w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium text-gray-900 placeholder-gray-400";
  const labelStyle = "text-xs font-bold text-gray-500 mb-1 block uppercase";

  // Se ainda estiver carregando o usuário, mostra loading
  if (!user) return <div className="min-h-screen flex items-center justify-center text-green-800">Verificando acesso...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm text-gray-800 font-bold">←</button>
        <h1 className="text-xl font-bold text-gray-800">Novo Cadastro (Nuvem)</h1>
      </div>

      <form onSubmit={salvar} className="bg-white p-6 rounded-2xl shadow-sm space-y-5">
        
        {/* FOTO */}
        <div className="flex justify-center">
            <label className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer overflow-hidden relative">
                {foto ? <img src={foto} className="w-full h-full object-cover" /> : <span className="text-gray-400 font-bold text-xs text-center">📷 Foto</span>}
                <input type="file" accept="image/*" onChange={processarFoto} className="hidden" />
            </label>
        </div>

        {/* BRINCO E RAÇA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Nº Brinco</label>
            <input type="text" value={brinco} onChange={e => setBrinco(e.target.value)} className={inputStyle} placeholder="105" />
          </div>
          <div>
            <label className={labelStyle}>Raça</label>
            <input type="text" value={raca} onChange={e => setRaca(e.target.value)} className={inputStyle} placeholder="Nelore" />
          </div>
        </div>

        {/* SEXO E CATEGORIA */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className={labelStyle}>Sexo & Categoria</label>
            
            <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setSexo('Femea')} className={`flex-1 py-2 rounded-lg font-bold ${sexo === 'Femea' ? 'bg-pink-100 text-pink-700 border-2 border-pink-300' : 'bg-white text-gray-500 border'}`}>Fêmea</button>
                <button type="button" onClick={() => setSexo('Macho')} className={`flex-1 py-2 rounded-lg font-bold ${sexo === 'Macho' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-white text-gray-500 border'}`}>Macho</button>
            </div>

            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputStyle}>
                {(sexo === 'Femea' ? catFemea : catMacho).map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
        </div>

        {/* PESO E DATA */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className={labelStyle}>Peso (Kg)</label>
                <input type="number" value={peso} onChange={e => setPeso(e.target.value)} className={inputStyle} placeholder="0.0" />
            </div>
            <div>
                <label className={labelStyle}>Data</label>
                <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} className={inputStyle} />
            </div>
        </div>

        {/* ORIGEM */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className={labelStyle}>Origem do Animal</label>
            <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setOrigem('compra')} className={`flex-1 py-2 rounded-lg font-bold ${origem === 'compra' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-white text-gray-500 border'}`}>💰 Compra</button>
                <button type="button" onClick={() => setOrigem('nascido')} className={`flex-1 py-2 rounded-lg font-bold ${origem === 'nascido' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-white text-gray-500 border'}`}>🏠 Nascido Aqui</button>
            </div>

            {origem === 'compra' ? (
                <div>
                    <label className={labelStyle}>Valor Pago (R$)</label>
                    <input type="number" value={custo} onChange={e => setCusto(e.target.value)} className={inputStyle} placeholder="0.00" />
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className={labelStyle}>Mãe (ID ou Nome)</label>
                        <input type="text" value={mae} onChange={e => setMae(e.target.value)} className={inputStyle} placeholder="Ex: Vaca Mimosa" />
                    </div>
                    <div>
                        <label className={labelStyle}>Pai (Touro)</label>
                        <input type="text" value={pai} onChange={e => setPai(e.target.value)} className={inputStyle} placeholder="Ex: Touro Bandido" />
                    </div>
                </div>
            )}
        </div>

        <button disabled={carregando} type="submit" className="w-full bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-800 transition disabled:opacity-50">
            {carregando ? 'Salvando...' : 'Confirmar Cadastro'}
        </button>
      </form>
    </div>
  );
}