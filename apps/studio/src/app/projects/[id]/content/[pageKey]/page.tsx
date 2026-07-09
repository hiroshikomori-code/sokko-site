import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  META_PAGE_KEY,
  PAGE_LABELS,
  pageContentSchema,
  siteMetaContentSchema,
  type PageKey,
} from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { getProject } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { ContentEditor } from './content-editor';

/** 文言編集: ページ単位のエディタ */
export default async function ContentEditPage({
  params,
}: {
  params: Promise<{ id: string; pageKey: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id, pageKey } = await params;
  const project = await getProject(id);
  if (!project) redirect('/');

  const supabase = await createClient();
  const { data: page } = await supabase
    .from('pages')
    .select('page_key, content, version')
    .eq('project_id', id)
    .eq('page_key', pageKey)
    .maybeSingle();
  if (!page) redirect(`/projects/${id}/content`);

  const isMeta = pageKey === META_PAGE_KEY;
  const parsed = isMeta
    ? siteMetaContentSchema.safeParse(page.content)
    : pageContentSchema.safeParse(page.content);
  if (!parsed.success) redirect(`/projects/${id}/content`);

  const label = isMeta
    ? 'FAQ・AI向けサイト要約'
    : (PAGE_LABELS[pageKey as PageKey] ?? pageKey);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${id}/content`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← ページ一覧
        </Link>
        <p className="text-sm font-medium text-neutral-700">{project.name}</p>
      </div>

      <h1 className="mt-6 text-xl font-bold text-neutral-900">
        文言編集: {label}
        <span className="ml-2 text-sm font-normal text-neutral-400">
          v{page.version}
        </span>
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        テキストのみ編集できます（構成・デザイン・写真は変わりません）。
        保存後、
        <Link
          href={`/projects/${id}/steps/7`}
          className="text-blue-700 underline"
        >
          Step7の再公開
        </Link>
        で反映されます。
      </p>

      <div className="mt-6">
        <ContentEditor
          projectId={id}
          pageKey={pageKey}
          initial={parsed.data}
          isMeta={isMeta}
        />
      </div>
    </main>
  );
}
