/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  // Esta configuração silencia o erro do Turbopack na Vercel
  experimental: {
    turbo: {},
  },
  // Garante compatibilidade com módulos antigos se necessário
  webpack: (config) => {
    return config;
  },
};

module.exports = withPWA(nextConfig);