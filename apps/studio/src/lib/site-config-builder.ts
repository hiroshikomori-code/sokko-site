import {
  buildSiteConfig,
  projectInputSchema,
  META_PAGE_KEY,
  type DesignVariant,
  type ProjectInput,
  type SiteConfig,
} from '@sokko/shared';
import { createClient } from '@/lib/supabase/server';

type PageRow = { page_key: string; content: unknown };

type BuildData = {
  input: ProjectInput;
  pages: PageRow[];
  buildOpts: Parameters<typeof buildSiteConfig>[2];
};

/**
 * SiteConfig組み立てに必要な材料（①入力・生成ページ・お知らせ・画像・URL）を
 * DBから読み込む。本番ビルドとライブ建設ビュー（ドラフト）の共通部。
 */
async function loadBuildData(
  projectId: string,
  env: 'preview' | 'production',
): Promise<{ ok: true; data: BuildData } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select(
      'id, slug, input, template_id, preview_url, deploy_url, visuals, custom_domain, design_variant',
    )
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };

  const parsed = projectInputSchema.safeParse(project.input);
  if (!parsed.success) return { ok: false, error: '①入力が不完全です' };

  // slugは初回に確定（Worker名・URLの基礎。以後変えない）
  let slug: string = project.slug ?? '';
  if (!slug) {
    slug = `s-${project.id.slice(0, 8)}`;
    await supabase.from('projects').update({ slug }).eq('id', projectId);
  }

  const { data: pages } = await supabase
    .from('pages')
    .select('page_key, content')
    .eq('project_id', projectId);

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, body, created_at')
    .eq('project_id', projectId)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: template } = project.template_id
    ? await supabase
        .from('templates')
        .select('design_tokens')
        .eq('id', project.template_id)
        .single()
    : { data: null };
  const templateId =
    (template?.design_tokens as { templateId?: string } | null)?.templateId ??
    'shigyo-v1';

  // baseUrl: 独自ドメイン > 実デプロイURL > workers.devの規約URL（仮置き）
  // （初回デプロイ後にActionsが実URLを書き戻すので、以後のビルドで正しくなる）
  const fallbackUrl = `https://site-${slug}${env === 'preview' ? '-preview' : ''}.workers.dev`;
  const baseUrl =
    env === 'production'
      ? project.custom_domain
        ? `https://${project.custom_domain}`
        : (project.deploy_url ?? fallbackUrl)
      : (project.preview_url ?? fallbackUrl);

  // 画像スロット: bucket相対パス → 公開URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publicUrl = (path?: string) =>
    path ? `${supabaseUrl}/storage/v1/object/public/assets/${path}` : undefined;
  const visuals = (project.visuals ?? {}) as {
    logo?: string;
    hero?: string;
    hero_sm?: string;
    representative?: string;
    office?: string;
  };

  return {
    ok: true,
    data: {
      input: parsed.data,
      pages: (pages ?? []) as PageRow[],
      buildOpts: {
        slug,
        baseUrl,
        projectId: project.id,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        templateId,
        bakedAnnouncements: (announcements ?? []).map((a) => ({
          id: a.id,
          body: a.body,
          publishedAt: a.created_at,
        })),
        logoPath: publicUrl(visuals.logo),
        images: {
          hero: publicUrl(visuals.hero),
          heroSm: publicUrl(visuals.hero_sm),
          representative: publicUrl(visuals.representative),
          office: publicUrl(visuals.office),
        },
        variant: (project.design_variant ?? 'classic') as DesignVariant,
      },
    },
  };
}

/**
 * projects/pages/announcements から SiteConfig を組み立てて
 * projects.site_config に保存する（CIビルドはこのスナップショットを読む）。
 */
export async function buildAndSaveSiteConfig(
  projectId: string,
  env: 'preview' | 'production',
): Promise<{ ok: true; config: SiteConfig } | { ok: false; error: string }> {
  const loaded = await loadBuildData(projectId, env);
  if (!loaded.ok) return loaded;
  const { input, pages, buildOpts } = loaded.data;

  try {
    const config = buildSiteConfig(input, pages, buildOpts);

    const supabase = await createClient();
    const { error } = await supabase
      .from('projects')
      .update({ site_config: config })
      .eq('id', projectId);
    if (error) return { ok: false, error: 'SiteConfigの保存に失敗しました' };

    return { ok: true, config };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'SiteConfigの組み立てに失敗',
    };
  }
}

/**
 * ライブ建設ビュー用のドラフトSiteConfig（Step3）。
 * 生成済みのページだけでサイトを組み立てる＝ページが書き上がるたびに
 * ナビとページが増えていく。DBには保存しない（site_configは完成版専用）。
 * - トップページ未生成の間は組み立てない（呼び出し側が建設中表示を出す）
 * - サイト全体メタ（_meta）未生成の間は①入力の事実からFAQ等を仮組みする
 */
export async function buildDraftSiteConfig(
  projectId: string,
): Promise<{ ok: true; config: SiteConfig } | { ok: false; error: string }> {
  const loaded = await loadBuildData(projectId, 'preview');
  if (!loaded.ok) return loaded;
  const { input, pages, buildOpts } = loaded.data;

  const generated = new Set(pages.map((p) => p.page_key));
  if (!generated.has('home')) {
    return { ok: false, error: 'トップページを執筆中です' };
  }

  // 完成したページだけをナビに載せる（newsは生成不要なので常に含める）
  const partialInput: ProjectInput = {
    ...input,
    pages: {
      pageKeys: input.pages.pageKeys.filter(
        (k) => k === 'news' || generated.has(k),
      ),
    },
  };

  // _meta未生成の間の仮メタ: 入力の事実だけで組む（創作しない）
  const pageRows = generated.has(META_PAGE_KEY)
    ? pages
    : [
        ...pages,
        {
          page_key: META_PAGE_KEY,
          content: {
            llmsSummary: `${input.basics.officeName}。${input.basics.businessSummary}`,
            faq: [
              {
                question: '営業時間を教えてください',
                answer: `${input.basics.businessHours}（定休日: ${input.basics.closedDays}）です。`,
              },
              {
                question: '対応エリアはどこですか',
                answer: `${input.basics.serviceAreaText}に対応しています。`,
              },
              {
                question: '問い合わせ方法を教えてください',
                answer: `お電話（${input.basics.phone}）またはお問い合わせフォームからご連絡ください。`,
              },
            ],
          },
        },
      ];

  try {
    const config = buildSiteConfig(partialInput, pageRows, buildOpts);
    return { ok: true, config };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'ドラフトの組み立てに失敗',
    };
  }
}
