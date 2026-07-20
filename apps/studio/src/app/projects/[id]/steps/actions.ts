'use server';

import { redirect } from 'next/navigation';
import { projectInputSchema, type ProjectInput } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { classifyIndustry } from '@/lib/industry-classifier';
import { draftStep1, type Step1DraftSuggestion } from '@/lib/step1-drafter';
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
 * 打ち合わせメモからStep1の下書きを生成（②ユーザビリティテストの宿題）。
 * 保存はしない: 返した下書きをフォーム側が「空欄のみ」に流し込み、
 * オペレーターが確認・修正してから確定する。
 */
export async function draftStep1FromMemo(
  memo: string,
): Promise<
  { ok: true; draft: Step1DraftSuggestion } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const normalized = memo
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 12000);
  if (normalized.length < 30) {
    return {
      ok: false,
      error: 'メモが短すぎます。打ち合わせの内容をそのまま貼り付けてください',
    };
  }

  try {
    const draft = await draftStep1(normalized);
    return { ok: true, draft };
  } catch (err) {
    console.error('draftStep1FromMemo failed:', err);
    return { ok: false, error: '下書きの生成に失敗しました。もう一度お試しください' };
  }
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
