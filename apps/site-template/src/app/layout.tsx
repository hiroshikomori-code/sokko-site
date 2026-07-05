import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import { JsonLd } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
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
      <body className={notoSansJp.className}>{children}</body>
    </html>
  );
}
