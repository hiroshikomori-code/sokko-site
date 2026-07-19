import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Serif_JP, Zen_Maru_Gothic } from 'next/font/google';
import { JsonLd } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  // 900はfutureバリアントの極太見出し用
  weight: ['400', '500', '700', '900'],
});

// 見出し用の明朝体（classic）。site-kitは --font-serif-jp 経由で参照する（tokens.ts）
const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif-jp',
});

// 見出し用の丸ゴシック（warm）。--font-round-jp 経由で参照
const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-round-jp',
});

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
      <body
        className={`${notoSansJp.className} ${notoSerifJp.variable} ${zenMaruGothic.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
