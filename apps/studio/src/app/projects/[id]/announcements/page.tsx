import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProject } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { AnnouncementsManager } from './announcements-manager';

/**
 * お知らせ管理（§15: 投稿元 LINE/管理画面）。
 * LINE未設定のクライアントでも、オペレーターがここから更新できる。
 */
export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const project = await getProject(id);
  if (!project) redirect('/');

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, body, source, published, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 案件一覧
        </Link>
        <p className="text-sm font-medium text-neutral-700">{project.name}</p>
      </div>

      <h1 className="mt-6 text-xl font-bold text-neutral-900">お知らせ管理</h1>
      <p className="mt-1 text-sm text-neutral-500">
        店主のLINEからの投稿と同じお知らせ欄を、ここからも更新できます。
        {project.deploy_url && (
          <>
            {' '}
            <a
              href={`${project.deploy_url}/news`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              公開中のお知らせページを見る
            </a>
          </>
        )}
      </p>

      <div className="mt-6">
        <AnnouncementsManager
          projectId={project.id}
          announcements={announcements ?? []}
        />
      </div>
    </main>
  );
}
