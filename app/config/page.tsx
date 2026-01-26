'use client';

import { useState } from 'react';
import { db } from '../../db';
import { useRouter } from 'next/navigation';

export default function Configuracoes() {
  const router = useRouter();
  const [msg, setMsg] = useState('');

  // 1. Função de EXPORTAR (Backup)
  async function fazerBackup() {
    try {
      // Pega tudo do banco
      const todosAnimais = await db.animais.toArray();
      const todosEventos = await db.eventos.toArray();

      const dados = {
        data: new Date().toISOString(),
        animais: todosAnimais,
        eventos: todosEventos
      };

      // Cria um arquivo invisível e clica nele para baixar
      const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rebanho-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg('✅ Backup baixado com sucesso!');
    } catch (error) {
      console.error(error);
      setMsg('❌ Erro ao gerar backup.');
    }
  }

  // 2. Função de IMPORTAR (Restaurar)
  async function restaurarBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!confirm('ATENÇÃO: Isso vai substituir ou mesclar com os dados atuais. Recomendamos limpar o banco antes se for uma restauração completa. Continuar?')) {
      return;
    }

    const leitor = new FileReader();
    leitor.onload = async (evento) => {
      try {
        const texto = evento.target?.result as string;
        const dados = JSON.parse(texto);

        if (!dados.animais || !dados.eventos) {
          alert('Arquivo inválido!');
          return;
        }

        // Adiciona tudo ao banco (bulkPut atualiza se o ID já existir)
        await db.animais.bulkPut(dados.animais);
        await db.eventos.bulkPut(dados.eventos);

        setMsg(`✅ Importado: ${dados.animais.length} animais recuperados.`);
      } catch (error) {
        console.error(error);
        setMsg('❌ Erro ao ler arquivo.');
      }
    };
    leitor.readAsText(arquivo);
  }

  // 3. Função de LIMPAR TUDO (Reset)
  async function apagarTudo() {
    if (confirm('PERIGO: Você vai apagar TODOS os animais e históricos deste aparelho. Tem certeza absoluta?')) {
      await db.animais.clear();
      await db.eventos.clear();
      setMsg('🗑️ Banco de dados limpo.');
      setTimeout(() => router.push('/'), 1000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm">←</button>
        <h1 className="text-xl font-bold text-gray-800">Configurações e Dados</h1>
      </div>

      <div className="space-y-4">
        
        {/* Cartão de Backup */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2">💾 Salvar Dados (Backup)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Baixe um arquivo com todo o seu rebanho para guardar em segurança ou passar para outro celular.
          </p>
          <button 
            onClick={fazerBackup}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow hover:bg-blue-700"
          >
            Baixar Backup Agora
          </button>
        </div>

        {/* Cartão de Restaurar */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2">📂 Restaurar Dados</h2>
          <p className="text-sm text-gray-500 mb-4">
            Carregue um arquivo de backup (.json) para recuperar seus animais.
          </p>
          <label className="block w-full cursor-pointer bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-200">
            <span className="text-gray-600 font-medium">Toque para selecionar arquivo</span>
            <input type="file" accept=".json" onChange={restaurarBackup} className="hidden" />
          </label>
        </div>

        {/* Zona de Perigo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <h2 className="font-bold text-red-600 mb-2">☠️ Zona de Perigo</h2>
          <button 
            onClick={apagarTudo}
            className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200"
          >
            Apagar Tudo (Resetar App)
          </button>
        </div>

        {/* Mensagens de Status */}
        {msg && (
          <div className="fixed bottom-4 left-4 right-4 bg-gray-800 text-white p-4 rounded-xl shadow-2xl text-center animate-pulse">
            {msg}
          </div>
        )}

      </div>
    </div>
  );
}