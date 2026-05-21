'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MenuLateral() {
  const [aberto, setAberto] = useState(false);
  const [emailUsuario, setEmailUsuario] = useState<string | null>(null);
  
  const [possuiBalanca, setPossuiBalanca] = useState<boolean>(false);
  const [alertasPendentes, setAlertasPendentes] = useState<number>(0);

  const pathname = usePathname();
  const router = useRouter();

  const fechar = () => setAberto(false);

  useEffect(() => {
    const getDadosIniciais = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmailUsuario(user.email ?? 'Usuário');
        setPossuiBalanca(true); 
        
        const { data: animais } = await supabase
          .from('animais')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ativo');

        const { data: pesagens } = await supabase
          .from('pesagens')
          .select('*')
          .order('data_hora', { ascending: false });

        let contadorAlertas = 0;

        if (animais && pesagens) {
          const agora = new Date();

          animais.forEach((boi: any) => {
            const chaveBusca = boi.rfid || boi.brinco;
            const historicoBoi = pesagens.filter(p => p.rfid === chaveBusca);

            if (historicoBoi.length === 0) return;

            const ultimaPesagem = historicoBoi[0];
            const dataUltima = new Date(ultimaPesagem.data_hora).getTime();
            const dataVerificacao = boi.data_verificacao_alerta ? new Date(boi.data_verificacao_alerta).getTime() : 0;
            
            const horasSumido = (agora.getTime() - dataUltima) / (1000 * 60 * 60);
            const dataFicouSumido = dataUltima + (48 * 60 * 60 * 1000); 
            
            if (horasSumido > 48 && dataVerificacao < dataFicouSumido) {
              contadorAlertas++;
              return; 
            }

            if (historicoBoi.length >= 2) {
              let penultimaReal = historicoBoi.find(p => (dataUltima - new Date(p.data_hora).getTime()) > (12 * 60 * 60 * 1000));
              if (!penultimaReal) penultimaReal = historicoBoi[1];

              const diferencaPeso = ultimaPesagem.peso - penultimaReal.peso;

              if (dataVerificacao < dataUltima && diferencaPeso <= -2) {
                contadorAlertas++;
              }
            }
          });
        }

        setAlertasPendentes(contadorAlertas);
      }
    };
    
    getDadosIniciais();
  }, [pathname]);

  const deslogar = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    fechar();
  };

  const links = [
    { nome: 'Dashboard', url: '/', icone: '📊' },
    { nome: 'Meu Rebanho', url: '/rebanho', icone: '🐮' },
    
    ...(possuiBalanca ? [
      { nome: 'Balança Smart', url: '/balanca', icone: '⚖️' },
      { nome: 'Atenção', url: '/atencao', icone: '🚨', badge: alertasPendentes },
    ] : [
      { nome: 'Balança Smart', url: '/comprar-balanca', icone: '🔒', bloqueado: true },
    ]),

    { nome: 'Perfil', url: '/perfil', icone: '👤' },
    { nome: 'Configurações', url: '/config', icone: '⚙️' },
  ];

  return (
    <>
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

      {aberto && (
        <div 
          onClick={fechar}
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity"
        />
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-[60] transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        
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

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            
            if (link.bloqueado) {
              return (
                <div key={link.nome} className="flex items-center gap-4 p-3 rounded-xl opacity-40 cursor-not-allowed bg-gray-800/30 border border-gray-700/50" title="Adquira a Balança FaceBoi para liberar">
                  <span className="text-xl grayscale">{link.icone}</span>
                  <span className="text-sm uppercase tracking-wide flex-1 text-gray-500">{link.nome}</span>
                  <span className="text-[9px] bg-green-900/50 text-green-500 px-2 py-0.5 rounded-sm font-bold border border-green-800">PRO</span>
                </div>
              );
            }

            const ativo = pathname === link.url;
            return (
              <Link key={link.url} href={link.url} onClick={fechar}>
                <div className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${ativo ? 'bg-green-600 text-white font-bold shadow-lg shadow-green-900/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                  <span className={`text-xl transition-transform group-hover:scale-110 ${ativo ? 'scale-110' : ''}`}>{link.icone}</span>
                  <span className="text-sm uppercase tracking-wide flex-1">{link.nome}</span>
                  
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-900/50 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 bg-gray-900">
            <button 
                onClick={deslogar}
                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl transition-all hover:bg-red-500/10 text-red-500 border border-transparent hover:border-red-500/20 group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">🚪</span>
                <span className="text-sm font-bold uppercase">Sair do Sistema</span>
            </button>
            <p className="text-center text-[10px] text-gray-600 mt-4 font-mono">v1.3.0</p>
        </div>
      </div>
    </>
  );
}