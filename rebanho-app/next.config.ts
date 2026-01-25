/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  // Isso ajuda a evitar conflitos com o Turbopack na Vercel
  experimental: {
    turbo: {},
  },
  // Se você tiver outras configs como imagens ou redirecionamentos, coloque aqui
};

module.exports = withPWA(nextConfig);