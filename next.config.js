/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Garante que funciona em desenvolvimento e produção
  runtimeCaching: [
    {
      // Cacheia arquivos estáticos (JS, CSS, Imagens)
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60 * 30 // 1 mês
        },
        networkTimeoutSeconds: 10, // Se a net demorar, usa o cache
      },
    }
  ]
});

const nextConfig = {
  reactStrictMode: true,
  // Isso aqui ajuda a não travar a navegação
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = withPWA(nextConfig);