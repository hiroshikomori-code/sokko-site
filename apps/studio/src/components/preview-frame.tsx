'use client';

import { useRouter } from 'next/navigation';

/**
 * studio内プレビューのラッパー。
 * site-kit が出力する素の <a href="/..."> クリックを横取りして
 * プレビュールート内のナビゲーションに変換する（site-kit を純粋なまま保つ）。
 */
export function PreviewFrame({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onClickCapture = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    const suffix = href === '/' ? '' : href;
    router.push(`/projects/${projectId}/preview${suffix}`);
  };

  return <div onClickCapture={onClickCapture}>{children}</div>;
}
