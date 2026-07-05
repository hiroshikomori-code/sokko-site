import {
  buildSiteConfig,
  projectInputSchema,
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
    .select('id, slug, input, template_id, preview_url, deploy_url')
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

  // baseUrl: 実デプロイURLがあればそれを、無ければworkers.devの規約URLを仮置き
  // （初回デプロイ後にActionsが実URLを書き戻すので、以後のビルドで正しくなる）
  const fallbackUrl = `https://site-${slug}${env === 'preview' ? '-preview' : ''}.workers.dev`;
  const baseUrl =
    env === 'production'
      ? (project.deploy_url ?? fallbackUrl)
      : (project.preview_url ?? fallbackUrl);

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
