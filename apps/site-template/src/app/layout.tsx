import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import { JsonLd } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  // 900はfutureバリアントの極太見出し用
  weight: ['400', '500', '700', '900'],
});

// 見出しの明朝（classic）・丸ゴシック（warm)はWebフォントを使わず端末内蔵書体
// （ヒラギノ明朝/游明朝等。tokens.tsのフォールバック連鎖で解決）。
// 和文セリフのWebフォントはグリフ分割でも700KB級になり、モバイル品質ゲートを
// 大きく悪化させることが実測で判明したため（Android等では自動的にゴシック代替）

const config = loadSiteConfig();

export const metadata: Metadata = {
  metadataBase: new URL(config.meta.baseUrl),
  title: config.pages[0]?.title ?? config.meta.siteName,
  description: config.pages[0]?.description ?? '',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <JsonLd config={config} />
      </head>
      <body className={notoSansJp.className}>{children}</body>
    </html>
  );
}
