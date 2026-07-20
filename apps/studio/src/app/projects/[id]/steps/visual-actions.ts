'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// hero_sm はヒーローのモバイル用縮小版（Step4がhero保存時に自動生成）
const VISUAL_SLOTS = ['logo', 'hero', 'hero_sm', 'representative', 'office'] as const;

export type SaveVisualResult = { ok: true } | { ok: false; error: string };

/** 画像スロットの割当を保存（pathはbucket相対。nullで解除） */
export async function saveVisualSlot(
  projectId: string,
  slot: string,
  path: string | null,
): Promise<SaveVisualResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!(VISUAL_SLOTS as readonly string[]).includes(slot)) {
    return { ok: false, error: '不明な画像スロットです' };
  }
  // パスは自案件配下のみ許可（他案件の画像を参照させない）
  if (path !== null && !path.startsWith(`projects/${projectId}/`)) {
    return { ok: false, error: '画像パスが不正です' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('visuals, status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  // 公開後も差し替え可（反映は再デプロイ時）。生成中のみロック
  if (project.status === 'generating') {
    return { ok: false, error: '生成中は画像を変更できません' };
  }

  const visuals = { ...(project.visuals as Record<string, string>) };
  if (path === null) delete visuals[slot];
  else visuals[slot] = path;

  const { error } = await supabase
    .from('projects')
    .update({ visuals })
    .eq('id', projectId);
  if (error) return { ok: false, error: '保存に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: path ? 'visual_uploaded' : 'visual_removed',
    detail: { slot },
  });
  return { ok: true };
}
