'use server';

import { redirect } from 'next/navigation';
import { META_PAGE_KEY, projectInputSchema } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { inputHash } from '@/lib/generation/hash';

export type StartResult =
  | { ok: true; jobIds: string[] }
  | { ok: false; error: string };

/**
 * Step3開始: 生成ジョブを作成し status='generating' へ。
 * 入力が変わっていないページ（input_hash一致）はスキップして原価を守る。
 */
export async function startGeneration(projectId: string): Promise<StartResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, input, status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (!['draft', 'revising'].includes(project.status)) {
    return { ok: false, error: 'この状態では生成を開始できません' };
  }

  const parsed = projectInputSchema.safeParse(project.input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'ヒアリング入力が未完成です。Step1を確定してください',
    };
  }
  const input = parsed.data;
  const hash = inputHash(input);

  // 生成対象: 選択ページ（news除く）＋ サイト全体メタ
  const targets = [
    ...input.pages.pageKeys.filter((k) => k !== 'news'),
    META_PAGE_KEY,
  ];

  // 既に同一入力で生成済み（かつ差し戻しされていない）ページはスキップ
  const { data: pages } = await supabase
    .from('pages')
    .select('page_key, input_hash, needs_revision')
    .eq('project_id', projectId);
  const upToDate = new Set(
    (pages ?? [])
      .filter((p) => p.input_hash === hash && !p.needs_revision)
      .map((p) => p.page_key),
  );
  const toGenerate = targets.filter((k) => !upToDate.has(k));

  if (toGenerate.length === 0) {
    return { ok: true, jobIds: [] };
  }

  // 未完了の古いジョブを掃除してから新しいジョブを積む
  await supabase
    .from('generation_jobs')
    .delete()
    .eq('project_id', projectId)
    .in('status', ['queued', 'failed']);

  const { data: jobs, error } = await supabase
    .from('generation_jobs')
    .insert(
      toGenerate.map((pageKey) => ({
        project_id: projectId,
        page_key: pageKey,
        status: 'queued',
        input_hash: hash,
      })),
    )
    .select('id');
  if (error || !jobs) return { ok: false, error: 'ジョブの作成に失敗しました' };

  await supabase
    .from('projects')
    .update({ status: 'generating' })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'generation_started',
    detail: { pages: toGenerate },
  });

  return { ok: true, jobIds: jobs.map((j) => j.id) };
}

/**
 * 全ページ生成完了後: status を戻し Step4 へ進める。
 * 完了条件はサーバー側で再検証する（クライアントの申告を信じない）。
 */
export async function completeGeneration(
  projectId: string,
): Promise<{ ok: false; error: string } | never> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, input, status, current_step')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };

  const parsed = projectInputSchema.safeParse(project.input);
  if (!parsed.success) return { ok: false, error: '①入力が不正です' };
  const hash = inputHash(parsed.data);

  const targets = [
    ...parsed.data.pages.pageKeys.filter((k) => k !== 'news'),
    META_PAGE_KEY,
  ];
  const { data: pages } = await supabase
    .from('pages')
    .select('page_key, input_hash')
    .eq('project_id', projectId);
  const done = new Set(
    (pages ?? []).filter((p) => p.input_hash === hash).map((p) => p.page_key),
  );
  const missing = targets.filter((k) => !done.has(k));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `未生成のページがあります: ${missing.join(', ')}`,
    };
  }

  await supabase
    .from('projects')
    .update({
      status: project.status === 'generating' ? 'draft' : project.status,
      current_step: Math.max(project.current_step, 4),
    })
    .eq('id', projectId);
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'generation_completed',
    detail: {},
  });

  redirect(`/projects/${projectId}/steps/4`);
}
