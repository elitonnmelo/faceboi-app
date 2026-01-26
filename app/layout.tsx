import "./globals.css";
import { Inter } from "next/font/google"; // Usando Inter que é padrão e seguro
import MenuLateral from "@/components/MenuLateral";
import StatusConexao from "@/components/StatusConexao";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <StatusConexao />
        <MenuLateral />
        {children}
      </body>
    </html>
  );
}