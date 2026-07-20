'use server';

import { redirect } from 'next/navigation';
import { projectInputSchema, type ProjectInput } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { classifyIndustry } from '@/lib/industry-classifier';
import { createClient } from '@/lib/supabase/server';

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Step1 下書き保存。バリデーションせず入力途中の状態をそのまま保持する
 * （ブラウザを閉じても再開できる＝再現性。検証は「次へ」で必ず通る）。
 */
export async function saveStep1Draft(
  projectId: string,
  input: unknown,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ input })
    .eq('id', projectId)
    .in('status', ['draft', 'revising']);

  if (error) return { ok: false, error: '保存に失敗しました' };
  return { ok: true };
}

/**
 * Step1 確定。①入力スキーマ（必須燃料込み）を満たさない限り先に進めない。
 */
export async function submitStep1(
  projectId: string,
  input: unknown,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: '未入力または形式が正しくない項目があります',
      fieldErrors,
    };
  }

  const data: ProjectInput = parsed.data;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('current_step, status, input')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (!['draft', 'revising'].includes(project.status)) {
    return { ok: false, error: 'この状態では入力を変更できません' };
  }

  // 業種はオペレーターに選ばせず、内容からAIが判定する（Step2で確認・修正可能）。
  // 広告規制の重い業種（医療等）はここで検知して止める＝自己申告より確実なゲート
  const judgement = await classifyIndustry({
    officeName: data.basics.officeName,
    businessSummary: data.basics.businessSummary,
    strengths: data.strengths.strengths,
  });
  if (judgement?.restricted) {
    return {
      ok: false,
      error: `この業種（${judgement.industryLabel}）は広告表現の規制が特に厳しいため、現在は対応準備中です。システム管理者にご相談ください${judgement.restrictedReason ? `（判定理由: ${judgement.restrictedReason}）` : ''}`,
    };
  }
  if (judgement) {
    data.basics.industryType = judgement.presetKey;
    data.basics.industryLabel = judgement.industryLabel;
  } else {
    // 判定失敗時（API障害）: 過去の判定結果を引き継いで確定はブロックしない
    const prev = (project.input as ProjectInput | null)?.basics;
    if (prev?.industryType) data.basics.industryType = prev.industryType;
    if (prev?.industryLabel) data.basics.industryLabel = prev.industryLabel;
  }

  const { error } = await supabase
    .from('projects')
    .update({
      input: data,
      current_step: Math.max(project.current_step, 2),
    })
    .eq('id', projectId);

  if (error) return { ok: false, error: '保存に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'step1_submitted',
    detail: {},
  });

  redirect(`/projects/${projectId}/steps/2`);
}
