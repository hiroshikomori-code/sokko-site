'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * 案件の削除（公開前のみ）。
 * 公開済みは配信中サイトの停止を伴うためUIからは削除できない
 * （壊せない設計: 誤操作で公開中のサイトを消せないようにする）。
 * 関連データ（pages・announcements等）はFKのcascadeで消え、
 * audit_logは残る（project_idはnullになるためdetailに案件名を控える）。
 */
export async function deleteProject(projectId: string): Promise<DeleteResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('name, status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (project.status === 'published') {
    return {
      ok: false,
      error:
        '公開済みの案件は削除できません（公開サイトの停止を伴うため、システム管理者にご依頼ください）',
    };
  }
  if (project.status === 'generating') {
    return { ok: false, error: '生成中の案件は削除できません（完了後にお試しください）' };
  }

  // 画像アセットの掃除（失敗しても削除は続行。孤児ファイルに実害はない）
  const { data: files } = await supabase.storage
    .from('assets')
    .list(`projects/${projectId}`);
  if (files && files.length > 0) {
    await supabase.storage
      .from('assets')
      .remove(files.map((f) => `projects/${projectId}/${f.name}`));
  }

  // 削除の記録（projects削除後はproject_idがnullになるため名前をdetailに残す）
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'project_deleted',
    detail: { name: project.name, status: project.status },
  });

  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) return { ok: false, error: '削除に失敗しました' };

  revalidatePath('/');
  return { ok: true };
}
