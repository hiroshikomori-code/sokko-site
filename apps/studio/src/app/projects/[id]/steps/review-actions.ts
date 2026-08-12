'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { dispatchSiteDeploy } from '@/lib/deploy';
import { buildAndSaveSiteConfig } from '@/lib/site-config-builder';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * サイトの非公開化（Step7・承認者のみ）。
 * Cloudflare Workerを削除して配信を止める。承認記録は残るため、
 * 再公開は「サイトを公開する」を押すだけ（同じURLで復活する）。
 */
export async function unpublishSite(projectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'approver') {
    return { ok: false, error: 'サイトの非公開化は承認者のみ実行できます' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('slug, status')
    .eq('id', projectId)
    .single();
  if (!project?.slug) return { ok: false, error: '案件が見つかりません' };
  if (project.status !== 'published') {
    return { ok: false, error: '公開中のサイトではありません' };
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    return {
      ok: false,
      error: '配信設定が未構成です（システム管理者にご相談ください）',
    };
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/site-${project.slug}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
  } | null;
  if (!res.ok || !body?.success) {
    console.error('unpublishSite failed:', res.status, body);
    return {
      ok: false,
      error: '配信の停止に失敗しました。時間をおいてもう一度お試しください',
    };
  }

  await supabase
    .from('projects')
    .update({ status: 'review', deploy_url: null })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'site_unpublished',
    detail: { slug: project.slug },
  });
  return { ok: true };
}

/**
 * デプロイ完了の検知（Step6/7のローディング表示用）。
 * GitHub Actionsが完了時に書き込む audit_log（deployed_preview / deployed_production）を
 * クライアントが10秒間隔でポーリングし、完了したら自動で画面を更新する。
 */
export async function checkDeployCompleted(
  projectId: string,
  env: 'preview' | 'production',
  sinceIso: string,
): Promise<{ done: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('id')
    .eq('project_id', projectId)
    .eq('action', `deployed_${env}`)
    .gt('created_at', sinceIso)
    .limit(1);
  return { done: (data?.length ?? 0) > 0 };
}

/** Step3/5の単純な前進（写真配置・AEO確認は確認のみで次へ進める） */
export async function advanceStep(
  projectId: string,
  fromStep: 3 | 5,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('current_step, status')
    .eq('id', projectId)
    .single();
  if (!project) redirect('/');

  await supabase
    .from('projects')
    .update({ current_step: Math.max(project.current_step, fromStep + 1) })
    .eq('id', projectId);
  redirect(`/projects/${projectId}/steps/${fromStep + 1}`);
}

/**
 * プレビューデプロイ（Step6）:
 * SiteConfigを組み立て保存 → GitHub Actionsをdispatch → status='review'
 */
export async function deployPreview(projectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  // published も許可: 公開後の差し替え→プレビュー確認→再承認→再公開のサイクル
  // （本番サイトはこの操作では変わらない。反映はStep7の再公開時）
  if (!['draft', 'revising', 'review', 'published'].includes(project.status)) {
    return { ok: false, error: 'この状態ではデプロイできません' };
  }

  // 差し戻し対応が残っているページがあれば先に再生成させる（黙って古いまま出さない）
  const { data: needsRevision } = await supabase
    .from('pages')
    .select('page_key')
    .eq('project_id', projectId)
    .eq('needs_revision', true);
  if ((needsRevision ?? []).length > 0) {
    return {
      ok: false,
      error: `差し戻し対応が未完了のページがあります（Step4で再生成してください）: ${(needsRevision ?? []).map((p) => p.page_key).join(', ')}`,
    };
  }

  const built = await buildAndSaveSiteConfig(projectId, 'preview');
  if (!built.ok) return built;

  const dispatched = await dispatchSiteDeploy(projectId, 'preview');
  if (!dispatched.ok) return dispatched;

  await supabase
    .from('projects')
    .update({ status: 'review', approved_at: null, approved_by: null })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'preview_deploy_requested',
    detail: {},
  });
  return { ok: true };
}

/**
 * 承認（Step6→7）。活性条件をサーバー側で3点再検証する（計画3章）:
 * ①承認者ロール ②最新quality_checksが合格（警告は明示承認扱い） ③status='review'
 */
export async function approveProject(projectId: string): Promise<ActionResult | never> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'approver') {
    return { ok: false, error: '承認は承認者のみ実行できます' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('status, current_step')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (project.status !== 'review') {
    return { ok: false, error: 'レビュー待ち状態ではありません' };
  }

  const { data: latestCheck } = await supabase
    .from('quality_checks')
    .select('passed, checked_at')
    .eq('project_id', projectId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestCheck?.passed) {
    return {
      ok: false,
      error: '品質チェックに合格していません。チェックを実行し、問題を解消してください',
    };
  }

  await supabase
    .from('projects')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      current_step: Math.max(project.current_step, 7),
    })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'approved',
    detail: {},
  });
  redirect(`/projects/${projectId}/steps/7`);
}

/**
 * 差し戻し（計画3.1章）: 対象ページ複数選択＋理由コメント必須。
 * status→'revising'、対象pagesにneeds_revisionフラグ。
 */
export async function rejectProject(
  projectId: string,
  pageKeys: string[],
  note: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'approver') {
    return { ok: false, error: '差し戻しは承認者のみ実行できます' };
  }
  if (pageKeys.length === 0) {
    return { ok: false, error: '差し戻すページを選択してください' };
  }
  if (!note.trim()) {
    return { ok: false, error: '差し戻し理由を入力してください' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (project.status !== 'review') {
    return { ok: false, error: 'レビュー待ち状態ではありません' };
  }

  const { error } = await supabase
    .from('pages')
    .update({ needs_revision: true, revision_note: note.trim() })
    .eq('project_id', projectId)
    .in('page_key', pageKeys);
  if (error) return { ok: false, error: '差し戻しの記録に失敗しました' };

  await supabase
    .from('projects')
    .update({ status: 'revising', approved_at: null, approved_by: null })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'rejected',
    detail: { pages: pageKeys, note: note.trim() },
  });
  return { ok: true };
}

/** 本番公開（Step7）: 承認済みのみ。GitHub Actionsが完了時にstatus='published'を書く */
export async function deployProduction(projectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('status, approved_at')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (!project.approved_at) {
    return { ok: false, error: '承認されていません。Step6で承認を得てください' };
  }

  const built = await buildAndSaveSiteConfig(projectId, 'production');
  if (!built.ok) return built;

  const dispatched = await dispatchSiteDeploy(projectId, 'production');
  if (!dispatched.ok) return dispatched;

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'production_deploy_requested',
    detail: {},
  });
  return { ok: true };
}
