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
        {draft === '1' && (
          // ライブ建設ビュー限定の「書き上がり演出」（公開サイトには入らない）
          <script dangerouslySetInnerHTML={{ __html: DRAFT_REVEAL_SCRIPT }} />
        )}
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

/**
 * ライブ建設ビューの「書き上がり演出」。
 * 初めて表示したページだけ、見出しをタイプライター風に打ち込み、
 * セクションを上から順に積み上げる（2回目以降は瞬時に表示）。
 * ハイドレーション衝突を避けるため、load後に素のDOMを直接動かす
 * （site-kitのAMBIENT_SCRIPTと同じ流儀）。失敗しても表示は壊さない。
 */
const DRAFT_REVEAL_SCRIPT = `
(function () {
  function run() {
    try {
      var key = 'sk-built:' + location.pathname;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      var secs = Array.prototype.slice.call(document.querySelectorAll('main section'));
      if (secs.length === 0) return;
      secs.forEach(function (s) {
        s.style.opacity = '0';
        s.style.transform = 'translateY(18px)';
        s.style.transition = 'opacity .45s ease, transform .45s ease';
        Array.prototype.forEach.call(s.querySelectorAll('img'), function (img) {
          img.style.filter = 'blur(12px)';
          img.style.transition = 'filter .8s ease';
        });
      });
      var delay = 250;
      secs.forEach(function (s, idx) {
        setTimeout(function () {
          try { s.scrollIntoView({ behavior: 'smooth', block: idx === 0 ? 'start' : 'center' }); } catch (e) {}
          s.style.opacity = '1';
          s.style.transform = 'none';
          Array.prototype.forEach.call(s.querySelectorAll('img'), function (img) {
            img.style.filter = 'none';
          });
          var h = s.querySelector('h1, h2, h3');
          if (h) {
            var full = h.textContent || '';
            h.textContent = '\u00A0';
            var i = 0;
            var step = Math.max(12, Math.min(40, Math.round(650 / Math.max(full.length, 1))));
            (function type() {
              i++;
              h.textContent = full.slice(0, i) + (i < full.length ? '\u258D' : '');
              if (i < full.length) setTimeout(type, step);
              else h.textContent = full;
            })();
          }
        }, delay);
        delay += 850;
      });
      // 組み立て終わったら先頭へ戻る
      setTimeout(function () {
        try { scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
      }, delay + 500);
    } catch (e) {}
  }
  if (document.readyState === 'complete') run();
  else addEventListener('load', run);
})();
`;
