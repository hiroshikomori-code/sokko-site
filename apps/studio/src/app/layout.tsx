import type { Metadata } from 'next';
import { Noto_Serif_JP } from 'next/font/google';
import './globals.css';

// サイトプレビュー（site-kit）の明朝体見出し用。本番サイトと同じ書体で確認できるようにする
const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif-jp',
});

export const metadata: Metadata = {
  title: 'ソッコーサイト',
  description: 'カミノバ 多業種向けAIサイト制作アプリ',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`h-full antialiased ${notoSerifJp.variable}`}>
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
