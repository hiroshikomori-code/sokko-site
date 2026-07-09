import Link from 'next/link';
import { redirect } from 'next/navigation';
import { META_PAGE_KEY, PAGE_LABELS, type PageKey } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { getProject } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';

/** 文言編集: ページ一覧（Part V-4 改稿フローの手動編集版） */
export default async function ContentIndexPage({
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
  const { data: pages } = await supabase
    .from('pages')
    .select('page_key, title, version, generated_at')
    .eq('project_id', id)
    .order('page_key');

  const label = (key: string) =>
    key === META_PAGE_KEY
      ? 'FAQ・AI向けサイト要約'
      : (PAGE_LABELS[key as PageKey] ?? key);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 案件一覧
        </Link>
        <p className="text-sm font-medium text-neutral-700">{project.name}</p>
      </div>

      <h1 className="mt-6 text-xl font-bold text-neutral-900">文言編集</h1>
      <p className="mt-1 text-sm text-neutral-500">
        ページの見出し・本文などの文言をピンポイントで修正できます（構成やデザインは変わりません）。
        保存後、Step7で再公開すると反映されます。
      </p>

      <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(pages ?? []).map((p) => (
          <li key={p.page_key}>
            <Link
              href={`/projects/${id}/content/${p.page_key}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {label(p.page_key)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  v{p.version} ・ 最終生成:{' '}
                  {p.generated_at
                    ? new Date(p.generated_at).toLocaleString('ja-JP')
                    : '-'}
                </p>
              </div>
              <span className="text-sm text-neutral-400">編集 →</span>
            </Link>
          </li>
        ))}
        {(pages ?? []).length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-neutral-500">
            まだ生成されたページがありません（Step3で生成してください）
          </li>
        )}
      </ul>
    </main>
  );
}
