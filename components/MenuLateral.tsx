'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MenuLateral() {
  const [aberto, setAberto] = useState(false);
  const [emailUsuario, setEmailUsuario] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fechar = () => setAberto(false);

  // 1. Busca o email do usuário logado para mostrar no menu
  useEffect(() => {
    const getUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmailUsuario(user.email ?? 'Usuário');
    };
    getUsuario();
  }, []);

  // 2. Função de Logout (Sair)
  const deslogar = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Erro ao sair do sistema");
    } else {
      router.push('/login');
      fechar();
    }
  };

  // Lista de Links
  const links = [
    { nome: 'Dashboard', url: '/', icone: '📊' },
    { nome: 'Meu Rebanho', url: '/rebanho', icone: '🐮' },
    { nome: 'Atenção', url: '/atencao', icone: '🚨' },
    { nome: 'Perfil', url: '/perfil', icone: '👤' },
    { nome: 'Configurações', url: '/config', icone: '⚙️' },
  ];

  return (
    <>
      {/* Botão Hamburguer (Só aparece se NÃO estiver na tela de login) */}
      {pathname !== '/login' && (
        <button 
          onClick={() => setAberto(true)}
          className="fixed top-5 left-4 z-40 p-2 bg-white rounded-lg shadow-md text-gray-800 hover:bg-gray-100 border border-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Fundo Escuro (Overlay) */}
      {aberto && (
        <div 
          onClick={fechar}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Gaveta do Menu */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Topo do Menu com Info do Usuário */}
        <div className="p-6 border-b border-gray-800 bg-gray-800/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-green-500 tracking-tighter italic">FACEBOI</h2>
            <button onClick={fechar} className="text-gray-400 hover:text-white p-1">✕</button>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center font-bold text-white uppercase">
                {emailUsuario ? emailUsuario[0] : 'U'}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-gray-100">{emailUsuario}</p>
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Produtor Ativo</p>
             </div>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {links.map((link) => {
            const ativo = pathname === link.url;
            return (
              <Link key={link.url} href={link.url} onClick={fechar}>
                <div className={`flex items-center gap-4 p-3 rounded-xl transition-all ${ativo ? 'bg-green-600 text-white font-bold shadow-lg shadow-green-900/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                  <span className="text-xl">{link.icone}</span>
                  <span className="text-sm uppercase tracking-wide">{link.nome}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Botão de Logout no Rodapé */}
        <div className="p-4 border-t border-gray-800">
            <button 
                onClick={deslogar}
                className="w-full flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-red-600/10 text-red-500 group"
            >
                <span className="text-xl group-hover:scale-110 transition">🚪</span>
                <span className="text-sm font-bold uppercase">Sair do Sistema</span>
            </button>
            <div className="mt-4 text-center text-[10px] text-gray-600 font-bold uppercase">
                v1.2.0 • Cloud Sync Ativo
            </div>
        </div>
      </div>
    </>
  );
}