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

/**
 * ステップゲート（計画3章: URL直打ちで飛べない）。
 * - 存在しない案件 → 一覧へ
 * - 先のステップへは current_step+1 まで
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
  if (step > project.current_step) {
    redirect(`/projects/${id}/steps/${project.current_step}`);
  }
  return project;
}
