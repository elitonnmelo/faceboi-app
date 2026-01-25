'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');

  async function lidarComAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (modo === 'cadastro') {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email para confirmar ou faça login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
        router.push('/'); // Manda pro dashboard
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🐮</div>
          <h1 className="text-2xl font-bold text-gray-800">FaceBoi</h1>
          <p className="text-gray-500">Gestão Profissional de Rebanho</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setModo('login')} 
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${modo === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Entrar
          </button>
          <button 
            onClick={() => setModo('cadastro')} 
            className={`flex-1 py-2 rounded-md text-sm font-bold transition ${modo === 'cadastro' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={lidarComAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900"
              placeholder="seu@email.com"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
            <input 
              type="password" 
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900"
              placeholder="******"
              required 
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-green-700 text-white font-bold py-4 rounded-xl hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Carregando...' : (modo === 'login' ? 'Acessar Sistema' : 'Cadastrar Grátis')}
          </button>
        </form>
      </div>
    </div>
  );
}