import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 生成サイトは完全静的（計画6章: 納品後サイトの可動部品ゼロ）
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
