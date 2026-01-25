/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  // Isso silencia o erro do Turbopack na Vercel
  experimental: {
    turbo: {},
  },
};

module.exports = withPWA(nextConfig);