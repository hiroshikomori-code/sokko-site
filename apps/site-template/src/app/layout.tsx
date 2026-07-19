import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import { JsonLd } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

// 見出し用の明朝体。site-kitは --font-serif-jp 経由で参照する（tokens.ts）
const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif-jp',
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
      <body className={`${notoSansJp.className} ${notoSerifJp.variable}`}>
        {children}
      </body>
    </html>
  );
}
