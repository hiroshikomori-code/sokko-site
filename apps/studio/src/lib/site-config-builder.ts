import {
  buildSiteConfig,
  projectInputSchema,
  type DesignVariant,
  type SiteConfig,
} from '@sokko/shared';
import { createClient } from '@/lib/supabase/server';

/**
 * projects/pages/announcements から SiteConfig を組み立てて
 * projects.site_config に保存する（CIビルドはこのスナップショットを読む）。
 */
export async function buildAndSaveSiteConfig(
  projectId: string,
  env: 'preview' | 'production',
): Promise<{ ok: true; config: SiteConfig } | { ok: false; error: string }> {
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
    representative?: string;
    office?: string;
  };
  const images = {
    hero: publicUrl(visuals.hero),
    representative: publicUrl(visuals.representative),
    office: publicUrl(visuals.office),
  };

  try {
    const config = buildSiteConfig(parsed.data, pages ?? [], {
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
      images,
      variant: (project.design_variant ?? 'classic') as DesignVariant,
    });

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
