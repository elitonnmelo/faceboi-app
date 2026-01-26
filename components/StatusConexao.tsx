'use client';
import { useState, useEffect } from 'react';

export default function StatusConexao() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const setOnline = () => setIsOnline(true);
      const setOffline = () => setIsOnline(false);

      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);

      return () => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOffline);
      };
    }
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest">
      Você está Offline - Os dados serão salvos localmente 📴
    </div>
  );
}