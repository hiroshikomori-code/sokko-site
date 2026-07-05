import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
