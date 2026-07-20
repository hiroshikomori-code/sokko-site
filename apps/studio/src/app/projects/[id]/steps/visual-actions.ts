'use server';

import { redirect } from 'next/navigation';
import { projectInputSchema, type DesignVariant } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { generateHeroImage } from '@/lib/hero-image-generator';
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

/**
 * ヒーロー画像のAI生成（Gemini）。生成画像はdataURLで返し、
 * クライアントが通常のアップロード経路（WebP変換→縮小版→保存）に流す。
 * 業種・デザイン・テーマカラーはプロジェクトの入力から自動で反映される。
 */
export async function generateHeroImageForProject(
  projectId: string,
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('input, design_variant, status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (project.status === 'generating') {
    return { ok: false, error: '生成中は画像を変更できません' };
  }

  const parsed = projectInputSchema.safeParse(project.input);
  if (!parsed.success) {
    return { ok: false, error: '先にStep1のヒアリング入力を確定してください' };
  }

  const result = await generateHeroImage({
    variant: (project.design_variant ?? 'classic') as DesignVariant,
    mainColor: parsed.data.mood.mainColor,
    industryLabel: parsed.data.basics.industryLabel,
    industryType: parsed.data.basics.industryType,
    businessSummary: parsed.data.basics.businessSummary,
  });
  if ('error' in result) return { ok: false, error: result.error };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'hero_image_generated',
    detail: {},
  });
  return { ok: true, dataUrl: result.dataUrl };
}
