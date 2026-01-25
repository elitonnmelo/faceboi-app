'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MenuLateral from "../components/MenuLateral";
import { useState, useEffect } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'FaceBoi',
  description: 'Gestão de Rebanho Inteligente',
  manifest: '/manifest.json', // <--- Importante!
  themeColor: '#15803d',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function StatusConexao() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  if (isOnline) return null; // Não mostra nada se estiver online

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[9999] uppercase tracking-widest">
      Você está Offline - Os dados serão salvos localmente 📴
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MenuLateral />
        {children}
      </body>
    </html>
  );
}
