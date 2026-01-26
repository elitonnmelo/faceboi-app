/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // IGNORA ERROS DE TYPESCRIPT NO BUILD
    ignoreBuildErrors: true,
  },
  eslint: {
    // IGNORA ERROS DE LINT (ESTILO) NO BUILD
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig