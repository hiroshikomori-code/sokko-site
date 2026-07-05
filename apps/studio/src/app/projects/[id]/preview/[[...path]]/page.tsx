import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageRenderer, SiteShell } from '@sokko/site-kit';
import { SAMPLE_SITE_CONFIG } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { getProject } from '@/lib/projects';
import { PreviewFrame } from '@/components/preview-frame';

/**
 * studio内プレビュー（計画1章: 軽い社内プレビュー）。
 * site-template と同じ site-kit コンポーネント＋同じSiteConfigでレンダリングする。
 * 生成パイプライン完成（タスク#5）までは、生成済みコンテンツが無い場合サンプルを表示。
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string; path?: string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id, path: pathParts } = await params;
  const project = await getProject(id);
  if (!project) redirect('/');

  // TODO(タスク#5): projects/pages から実SiteConfigを組み立てる。それまではサンプル
  const config = SAMPLE_SITE_CONFIG;

  const path = pathParts && pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';
  const page = config.pages.find((p) => p.path === path);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-300 bg-neutral-900 px-4 py-2 text-sm text-white">
        <p>
          プレビュー: {project.name}
          <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
            サンプルデータ表示中（生成前）
          </span>
        </p>
        <Link
          href={`/projects/${id}/steps/${project.current_step}`}
          className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
        >
          編集に戻る
        </Link>
      </div>
      <PreviewFrame projectId={id}>
        <SiteShell config={config} currentPath={path}>
          <PageRenderer page={page} config={config} />
        </SiteShell>
      </PreviewFrame>
    </div>
  );
}
