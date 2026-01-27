'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Perfil() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [fazenda, setFazenda] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // 1. Carregar Dados do Usuário
  useEffect(() => {
    const carregarPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setEmail(user.email || '');
      
      // Carrega os dados salvos nos metadados (se existirem)
      const meta = user.user_metadata || {};
      setNome(meta.full_name || '');
      setFazenda(meta.nome_fazenda || '');
      setLocalidade(meta.localidade || '');
      setAvatarUrl(meta.avatar_url || null);
      
      setLoading(false);
    };

    carregarPerfil();
  }, [router]);

  // 2. Função para Upload da Foto
  const atualizarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setSalvando(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Sobe a imagem para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      alert("Foto carregada! Clique em 'Salvar Alterações' para confirmar.");
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer upload da foto. Verifique se criou o bucket "avatars" público.');
    } finally {
      setSalvando(false);
    }
  };

  // 3. Salvar Tudo (Metadados)
  const salvarPerfil = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: nome,
          nome_fazenda: fazenda,
          localidade: localidade,
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;
      alert('Perfil atualizado com sucesso! ✅');
      window.location.reload(); // Recarrega para atualizar o menu lateral também
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const deslogar = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-800 font-bold">Carregando perfil...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20 pb-20">
      
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm overflow-hidden relative">
        
        {/* Capa Verde */}
        <div className="h-32 bg-green-700 relative">
             <div className="absolute top-4 right-4 cursor-pointer" onClick={deslogar}>
                <span className="bg-red-500/20 text-red-100 px-3 py-1 rounded-full text-xs font-bold border border-red-400 hover:bg-red-500 hover:text-white transition">SAIR</span>
             </div>
        </div>

        {/* Foto de Perfil Editável */}
        <div className="relative -mt-16 flex justify-center">
            <label className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Foto Perfil" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">👤</div>
                    )}
                </div>
                {/* Ícone de Câmera (Overlay) */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-2xl">📷</span>
                </div>
                <input type="file" accept="image/*" onChange={atualizarFoto} className="hidden" disabled={salvando} />
            </label>
        </div>

        {/* Formulário */}
        <div className="p-6 text-center space-y-4">
            
            {/* Nome e E-mail */}
            <div>
                <input 
                    type="text" 
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="text-2xl font-bold text-gray-800 text-center w-full border-b-2 border-transparent hover:border-gray-200 focus:border-green-500 outline-none bg-transparent transition"
                />
                <p className="text-sm text-gray-400">{email}</p>
            </div>

            {/* Fazenda e Localidade */}
            <div className="grid grid-cols-1 gap-3 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome da Fazenda</label>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-green-500">
                        <span>🏡</span>
                        <input 
                            type="text" 
                            value={fazenda}
                            onChange={e => setFazenda(e.target.value)}
                            placeholder="Ex: Fazenda Santa Rita"
                            className="w-full outline-none text-gray-800 font-medium placeholder-gray-300"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Localidade / Cidade</label>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-green-500">
                        <span>📍</span>
                        <input 
                            type="text" 
                            value={localidade}
                            onChange={e => setLocalidade(e.target.value)}
                            placeholder="Ex: Quixadá - CE"
                            className="w-full outline-none text-gray-800 font-medium placeholder-gray-300"
                        />
                    </div>
                </div>
            </div>

            {/* Botão Salvar */}
            <button 
                onClick={salvarPerfil}
                disabled={salvando}
                className="w-full bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-800 active:scale-95 transition disabled:opacity-50"
            >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            <div className="mt-6 border-t pt-4">
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Resumo da Conta</p>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plano</span>
                    <span className="font-bold text-green-600 bg-green-50 px-2 rounded">PRODUTOR (GRÁTIS)</span>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}