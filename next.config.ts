/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Isso evita que o build trave tentando gerar páginas estáticas
  output: 'standalone', 
  images: { unoptimized: true }
}

module.exports = nextConfig