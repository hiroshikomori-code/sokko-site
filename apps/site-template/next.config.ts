import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 生成サイトは完全静的（計画6章: 納品後サイトの可動部品ゼロ）
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
  experimental: {
    // CSSを<style>としてHTMLに同梱。レンダーブロッキングのCSS取得
    // （モバイル実測で約5秒の遅延要因）を丸ごと排除する。
    // 生成サイトは小規模＆初訪問者が主のため、キャッシュ効率よりFCP/LCP優先
    inlineCss: true,
  },
};

export default nextConfig;
