import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
 disable: process.env.NODE_ENV === "development", // Deixe false para testar o PWA mesmo em desenvolvimento
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Aqui você pode colocar outras configurações do Next.js se precisar no futuro
};

export default withPWA(nextConfig);