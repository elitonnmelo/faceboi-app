'use client';

export default function Perfil() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm text-center mb-6">
        <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">👤</div>
        <h2 className="text-xl font-bold text-gray-900">Éliton Melo</h2>
        <p className="text-gray-500">Administrador</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-bold">Nome da Fazenda</p>
            <p className="text-gray-800 font-medium">Fazenda FaceBoi</p>
        </div>
        <div className="p-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-bold">Localização</p>
            <p className="text-gray-800 font-medium">Ceará, BR</p>
        </div>
        <div className="p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Plano Atual</p>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">PREMIUM (GRÁTIS)</span>
        </div>
      </div>
    </div>
  );
}