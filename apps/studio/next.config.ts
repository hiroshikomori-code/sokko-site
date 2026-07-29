import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // クライアント資料（Excel/PDF等）のアップロード用（既定は1MB）
      bodySizeLimit: '16mb',
    },
  },
};

export default nextConfig;
