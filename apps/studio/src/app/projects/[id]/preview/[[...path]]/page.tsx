import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageRenderer, SiteShell } from '@sokko/site-kit';
import {
  DESIGN_VARIANT_KEYS,
  SAMPLE_SITE_CONFIG,
  type DesignVariant,
} from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { getProject } from '@/lib/projects';
import {
  buildAndSaveSiteConfig,
  buildDraftSiteConfig,
} from '@/lib/site-config-builder';
import { PreviewFrame } from '@/components/preview-frame';

/**
 * studio内プレビュー（計画1章: 軽い社内プレビュー）。
 * site-template と同じ site-kit コンポーネント＋同じSiteConfigでレンダリングする。
 * 生成済みならプロジェクトの実SiteConfigを組み立て、未生成ならサンプルを表示。
 *
 * クエリ:
 * - embed=1 … 上部バーなしの素のサイト表示（Step2/Step3の埋め込み用）
 * - draft=1 … 生成済みページだけで組むライブ建設ビュー（Step3。保存しない）
 * - variant=classic|future|warm|… … 保存済みデザインを一時的に差し替えて表示
 *   （見た目の試着のみ。DBのdesign_variantは変更しない）
 */
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; path?: string[] }>;
  searchParams: Promise<{ embed?: string; draft?: string; variant?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id, path: pathParts } = await params;
  const { embed, draft, variant: rawVariant } = await searchParams;
  const project = await getProject(id);
  if (!project) redirect('/');

  const built =
    draft === '1'
      ? await buildDraftSiteConfig(id)
      : await buildAndSaveSiteConfig(id, 'preview');
  const isSample = !built.ok;
  let config = built.ok ? built.config : SAMPLE_SITE_CONFIG;
  if (
    rawVariant &&
    (DESIGN_VARIANT_KEYS as readonly string[]).includes(rawVariant)
  ) {
    config = {
      ...config,
      design: { ...config.design, variant: rawVariant as DesignVariant },
    };
  }

  const path = pathParts && pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';
  const page = config.pages.find((p) => p.path === path);
  if (!page) notFound();

  if (embed === '1') {
    // 埋め込み時もサイト内リンクはプレビュー内遷移に変換する
    // （embed/draft/variantのクエリを引き継いで素の表示を維持）
    const carry = [
      'embed=1',
      draft === '1' ? 'draft=1' : null,
      rawVariant ? `variant=${rawVariant}` : null,
    ]
      .filter(Boolean)
      .join('&');
    return (
      <PreviewFrame projectId={id} query={carry}>
        <SiteShell config={config} currentPath={path}>
          <PageRenderer page={page} config={config} />
        </SiteShell>
      </PreviewFrame>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-300 bg-neutral-900 px-4 py-2 text-sm text-white">
        <p>
          プレビュー: {project.name}
          {isSample && (
            <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              サンプルデータ表示中（生成前: {!built.ok ? built.error : ''}）
            </span>
          )}
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
