import { redirect } from 'next/navigation';
import type { ProjectInputDraft, ProjectStatus } from '@sokko/shared';
import { createClient } from '@/lib/supabase/server';

export type Project = {
  id: string;
  name: string;
  slug: string | null;
  input: ProjectInputDraft;
  status: ProjectStatus;
  current_step: number;
  template_id: string | null;
  preview_url: string | null;
  deploy_url: string | null;
  approver_id: string | null;
};

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select(
      'id, name, slug, input, status, current_step, template_id, preview_url, deploy_url, approver_id',
    )
    .eq('id', id)
    .single();
  return (data as Project) ?? null;
}

/** 到達可能な最大ステップ（公開済みは納品情報まで全て閲覧可） */
export function maxReachableStep(project: Pick<Project, 'status' | 'current_step'>): number {
  return project.status === 'published' ? 8 : project.current_step;
}

/**
 * ステップゲート（計画3章: URL直打ちで飛べない）。
 * - 存在しない案件 → 一覧へ
 * - 先のステップへは到達済みまで（公開済みはStep8まで開放）
 * - 生成中は Step3 に固定
 */
export async function getProjectForStep(
  id: string,
  step: number,
): Promise<Project> {
  const project = await getProject(id);
  if (!project) redirect('/');

  if (project.status === 'generating' && step !== 3) {
    redirect(`/projects/${id}/steps/3`);
  }
  const maxStep = maxReachableStep(project);
  if (step > maxStep) {
    redirect(`/projects/${id}/steps/${maxStep}`);
  }
  return project;
}
