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
      {pathname !== '/login' && (
        <button 
          onClick={() => setAberto(true)}
          className="fixed top-5 left-4 z-40 p-2 bg-white rounded-lg shadow-md text-gray-800 border border-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {aberto && <div onClick={fechar} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" />}

      <div className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-800 bg-gray-800/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-green-500 italic">FACEBOI</h2>
            <button onClick={fechar} className="text-gray-400">✕</button>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center font-bold">{emailUsuario ? emailUsuario[0].toUpperCase() : 'U'}</div>
             <p className="text-sm font-bold truncate text-gray-100">{emailUsuario}</p>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {links.map((link) => {
            const ativo = pathname === link.url;
            return (
              <Link key={link.url} href={link.url} onClick={fechar}>
                <div className={`flex items-center gap-4 p-3 rounded-xl transition-all ${ativo ? 'bg-green-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>
                  <span>{link.icone}</span>
                  <span className="text-sm uppercase">{link.nome}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
            <button onClick={deslogar} className="w-full flex items-center gap-4 p-3 text-red-500">
                <span>🚪</span>
                <span className="text-sm font-bold uppercase">Sair</span>
            </button>
        </div>
      </div>
    </>
  );
}