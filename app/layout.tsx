import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import MenuLateral from "../components/MenuLateral";
import StatusConexao from "../components/StatusConexao"; // Vamos criar este abaixo

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata só funciona em Server Components (sem 'use client')
export const metadata = {
  title: 'FaceBoi',
  description: 'Gestão de Rebanho Inteligente',
  manifest: '/manifest.json',
  themeColor: '#15803d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StatusConexao />
        <MenuLateral />
        <main>{children}</main>
      </body>
    </html>
  );
}