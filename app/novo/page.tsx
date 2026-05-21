'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

const comprimirImagem = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
    };
  });
};

export default function NovoAnimal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Estados Padrões
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

  // --- NOVOS ESTADOS: ASSOCIAÇÃO RFID ---
  const [rfid, setRfid] = useState('');
  const [escutandoRfid, setEscutandoRfid] = useState(false);

  const catFemea = ['Bezerra', 'Garrota', 'Novilha', 'Vaca'];
  const catMacho = ['Bezerro', 'Garrote', 'Novilho', 'Boi', 'Touro'];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else setUser(session.user);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (sexo === 'Femea') setTipo(catFemea[0]);
    else setTipo(catMacho[0]);
  }, [sexo]);

  const processarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fotoComprimida = await comprimirImagem(file);
      setFoto(fotoComprimida);
    }
  };

  // --- NOVA FUNÇÃO: PUXAR ÚLTIMA LEITURA DA BALANÇA ---
  const puxarUltimaLeitura = async () => {
    setEscutandoRfid(true); 
    
    try {
      // Busca a última pesagem registrada no banco
      const { data, error } = await supabase
        .from('pesagens')
        .select('rfid, peso, data_hora')
        .order('data_hora', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Preenche os campos magicamente
        setRfid(data[0].rfid);
        setPeso(data[0].peso.toString());
        
        // Vibra o celular (se suportado) para confirmar
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        alert("Nenhum dado encontrado na balança.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a balança.");
    } finally {
      setEscutandoRfid(false);
    }
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!brinco || !peso) return alert("Preencha Brinco e Peso!");
    
    setCarregando(true);

    const dadosAnimal = {
        user_id: user.id,
        brinco,
        rfid: rfid || null, // Salva o RFID associado se existir
        raca: raca || 'Mestiço',
        peso_atual: Number(peso),
        sexo,
        tipo,
        origem,
        data_entrada: new Date(dataEntrada).toISOString(),
        custo_aquisicao: origem === 'compra' ? Number(custo) : 0,
        pai: origem === 'nascido' ? pai : null,
        mae: origem === 'nascido' ? mae : null,
        foto,
        status: 'ativo'
    };

    try {
        const { error } = await supabase.from('animais').insert([dadosAnimal]);
        if (error) throw error;

        // Tenta evoluir a mãe se tiver net
        if (origem === 'nascido' && mae) {
             try {
                const { data: maeData } = await supabase.from('animais').select('id, tipo').eq('user_id', user.id).ilike('brinco', mae.trim()).single();
                if (maeData && maeData.tipo !== 'Vaca') await supabase.from('animais').update({ tipo: 'Vaca' }).eq('id', maeData.id);
             } catch(e) {}
        }

        alert('Animal salvo na NUVEM com Associação de Brinco! ☁️✅');
        window.location.href = '/rebanho'; 

    } catch (erro) {
        console.log("Offline detectado. Salvando localmente...");
        try {
          await db.animaisPendentes.add({ ...dadosAnimal, criado_em: Date.now() });
          alert('Sem internet! Salvo no CELULAR 📱.');
          window.location.href = '/rebanho'; 
        } catch (e) {
          alert("Erro crítico ao salvar no celular.");
        }
    } finally {
        setCarregando(false);
    }
  }

  const inputStyle = "w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium text-gray-900 placeholder-gray-400";
  const labelStyle = "text-xs font-bold text-gray-500 mb-1 block uppercase";

  if (!user) return <div className="min-h-screen flex items-center justify-center text-green-800">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20 pt-16">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm text-gray-800 font-bold">←</button>
        <h1 className="text-xl font-bold text-gray-800">Novo Cadastro</h1>
      </div>
      <form onSubmit={salvar} className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
        
        {/* Foto do Animal */}
        <div className="flex justify-center">
            <label className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-green-500 transition shadow-sm">
                {foto ? <img src={foto} className="w-full h-full object-cover" /> : <span className="text-gray-400 font-bold text-xs text-center group-hover:text-green-600">📷 Foto</span>}
                <input type="file" accept="image/*" onChange={processarFoto} className="hidden" />
            </label>
        </div>

        {/* MÓDULO DE IDENTIFICAÇÃO (Visual + RFID) */}
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Identificação do Animal</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Brinco Visual *</label>
              <input type="text" value={brinco} onChange={e => setBrinco(e.target.value)} className={inputStyle} placeholder="Ex: 105" required />
            </div>
            <div>
              <label className={labelStyle}>Raça</label>
              <input type="text" value={raca} onChange={e => setRaca(e.target.value)} className={inputStyle} placeholder="Nelore" />
            </div>
          </div>

          <div className="pt-2">
            <label className={labelStyle}>Tag Eletrônica (RFID) Opcional</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={rfid} 
                onChange={e => setRfid(e.target.value)} 
                className={`${inputStyle} font-mono text-sm bg-gray-50`} 
                placeholder="0E31BD..." 
                readOnly={escutandoRfid}
              />
              <button 
                type="button" 
                onClick={puxarUltimaLeitura}
                disabled={escutandoRfid}
                className={`px-4 rounded-xl font-bold text-white transition-all shadow-sm flex items-center justify-center min-w-[50px]
                  ${escutandoRfid ? 'bg-blue-400 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                title="Puxar última leitura da balança"
              >
                {escutandoRfid ? '⏳' : '📡'}
              </button>
            </div>
            {rfid && !escutandoRfid && (
              <p className="text-xs font-bold text-green-600 mt-2">✅ Tag associada com sucesso!</p>
            )}
          </div>
        </div>

        {/* Restante do Formulário */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className={labelStyle}>Sexo & Categoria</label>
            <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setSexo('Femea')} className={`flex-1 py-2 rounded-lg font-bold transition ${sexo === 'Femea' ? 'bg-pink-100 text-pink-700 border-2 border-pink-300' : 'bg-white text-gray-500 border hover:bg-gray-100 shadow-sm'}`}>Fêmea</button>
                <button type="button" onClick={() => setSexo('Macho')} className={`flex-1 py-2 rounded-lg font-bold transition ${sexo === 'Macho' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-white text-gray-500 border hover:bg-gray-100 shadow-sm'}`}>Macho</button>
            </div>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputStyle}>{(sexo === 'Femea' ? catFemea : catMacho).map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Peso (Kg) *</label>
              <input type="number" value={peso} onChange={e => setPeso(e.target.value)} className={`${inputStyle} ${rfid && !escutandoRfid ? 'border-green-400 bg-green-50' : ''}`} placeholder="0.0" required />
            </div>
            <div>
              <label className={labelStyle}>Data Entrada</label>
              <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} className={inputStyle} />
            </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 transition-all duration-300">
            <label className={labelStyle}>Origem do Animal</label>
            <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setOrigem('compra')} className={`flex-1 py-2 rounded-lg font-bold transition shadow-sm ${origem === 'compra' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-white text-gray-500 border'}`}>💰 Compra</button>
                <button type="button" onClick={() => setOrigem('nascido')} className={`flex-1 py-2 rounded-lg font-bold transition shadow-sm ${origem === 'nascido' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-white text-gray-500 border'}`}>🏠 Nascido Aqui</button>
            </div>
            {origem === 'compra' ? (
                <div className="animate-fade-in"><label className={labelStyle}>Valor Pago (R$)</label><input type="number" value={custo} onChange={e => setCusto(e.target.value)} className={inputStyle} placeholder="0.00" /></div>
            ) : (
                <div className="space-y-3 animate-fade-in">
                    <div><label className={labelStyle}>Mãe (Brinco)</label><input type="text" value={mae} onChange={e => setMae(e.target.value)} className={inputStyle} placeholder="Ex: 105" /></div>
                    <div><label className={labelStyle}>Pai (Touro)</label><input type="text" value={pai} onChange={e => setPai(e.target.value)} className={inputStyle} placeholder="Ex: Touro 01" /></div>
                </div>
            )}
        </div>

        <button disabled={carregando} type="submit" className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition disabled:opacity-50 mt-4">
            {carregando ? 'Salvando...' : 'Confirmar Cadastro'}
        </button>
      </form>
    </div>
  );
}