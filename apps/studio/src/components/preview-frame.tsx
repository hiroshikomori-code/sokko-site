'use client';

import { useRouter } from 'next/navigation';

/**
 * studio内プレビューのラッパー。
 * site-kit が出力する素の <a href="/..."> クリックを横取りして
 * プレビュールート内のナビゲーションに変換する（site-kit を純粋なまま保つ）。
 */
export function PreviewFrame({
  projectId,
  query,
  children,
}: {
  projectId: string;
  /** 遷移先に引き継ぐクエリ（embed=1&draft=1 等。埋め込み表示の維持用） */
  query?: string;
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
    router.push(
      `/projects/${projectId}/preview${suffix}${query ? `?${query}` : ''}`,
    );
  };

  return <div onClickCapture={onClickCapture}>{children}</div>;
}
