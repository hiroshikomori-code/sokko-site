'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type AnnouncementResult = { ok: true } | { ok: false; error: string };

/**
 * 管理画面からのお知らせ投稿（§15: 投稿元 studio）。
 * LINE経路と同じ正規化（制御文字除去・500字上限）。
 * サイト側はライブ取得のため、投稿と同時に数秒で反映される。
 */
export async function postAnnouncement(
  projectId: string,
  formData: FormData,
): Promise<AnnouncementResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const body = String(formData.get('body') ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 500);
  if (!body) return { ok: false, error: 'お知らせの本文を入力してください' };

  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({
    project_id: projectId,
    body,
    source: 'studio',
    published: true,
  });
  if (error) return { ok: false, error: '投稿に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'announcement_posted',
    detail: { source: 'studio' },
  });
  revalidatePath(`/projects/${projectId}/announcements`);
  return { ok: true };
}

/** 公開/非公開の切替（削除の代わり。非公開はサイトから即座に消える） */
export async function toggleAnnouncement(
  projectId: string,
  announcementId: string,
  published: boolean,
): Promise<AnnouncementResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ published })
    .eq('id', announcementId)
    .eq('project_id', projectId);
  if (error) return { ok: false, error: '更新に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: published ? 'announcement_published' : 'announcement_unpublished',
    detail: { announcementId },
  });
  revalidatePath(`/projects/${projectId}/announcements`);
  return { ok: true };
}
