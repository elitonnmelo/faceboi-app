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

  useEffect(() => {
    const getUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmailUsuario(user.email ?? 'Usuário');
    };
    getUsuario();
  }, []);

  const deslogar = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    fechar();
  };

  const links = [
    { nome: 'Dashboard', url: '/', icone: '📊' },
    { nome: 'Meu Rebanho', url: '/rebanho', icone: '🐮' },
    { nome: 'Atenção', url: '/atencao', icone: '🚨' },
    { nome: 'Perfil', url: '/perfil', icone: '👤' },
    { nome: 'Configurações', url: '/config', icone: '⚙️' },
  ];

  return (
    <>
      {/* Botão do Menu (Discreto e Profissional) */}
      {pathname !== '/login' && (
        <button 
          onClick={() => setAberto(true)}
          className="fixed top-4 left-4 z-50 p-2.5 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="Abrir menu"
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
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Gaveta do Menu */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-[60] transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabeçalho do Menu */}
        <div className="p-6 border-b border-gray-800 bg-gray-800/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-green-500 italic tracking-tighter">FACEBOI</h2>
            <button onClick={fechar} className="text-gray-400 hover:text-white transition p-1">✕</button>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700">
             <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-green-900/50">
               {emailUsuario ? emailUsuario[0].toUpperCase() : 'U'}
             </div>
             <div className="overflow-hidden">
                <p className="text-xs text-gray-400 font-medium uppercase">Logado como</p>
                <p className="text-sm font-bold truncate text-white w-32">{emailUsuario}</p>
             </div>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            const ativo = pathname === link.url;
            return (
              <Link key={link.url} href={link.url} onClick={fechar}>
                <div className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${ativo ? 'bg-green-600 text-white font-bold shadow-lg shadow-green-900/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                  <span className={`text-xl transition-transform group-hover:scale-110 ${ativo ? 'scale-110' : ''}`}>{link.icone}</span>
                  <span className="text-sm uppercase tracking-wide">{link.nome}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
            <button 
                onClick={deslogar}
                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl transition-all hover:bg-red-500/10 text-red-500 border border-transparent hover:border-red-500/20 group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">🚪</span>
                <span className="text-sm font-bold uppercase">Sair do Sistema</span>
            </button>
            <p className="text-center text-[10px] text-gray-600 mt-4 font-mono">v1.2.0 • Stable Build</p>
        </div>
      </div>
    </>
  );
}