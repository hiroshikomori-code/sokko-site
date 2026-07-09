import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  generating: '生成中',
  revising: '差し戻し対応中',
  review: 'レビュー待ち',
  published: '公開済み',
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    // Authは通っているがusers未登録（=スタッフ外）の場合もここで弾く
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, current_step, deploy_url, updated_at')
    .order('updated_at', { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">ソッコーサイト</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {user.name}（{user.role === 'approver' ? '承認者' : 'オペレーター'}）
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            ログアウト
          </button>
        </form>
      </header>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">案件一覧</h2>
        <Link
          href="/projects/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          ＋ 新しいサイトを作る
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(projects ?? []).map((p) => (
          <li key={p.id} className="flex items-center hover:bg-neutral-50">
            <Link
              href={`/projects/${p.id}/steps/${p.current_step}`}
              className="flex min-w-0 flex-1 items-center justify-between px-5 py-4"
            >
              <div>
                <p className="font-medium text-neutral-900">{p.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  ステップ {p.current_step} / 8
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
            </Link>
            <Link
              href={`/projects/${p.id}/content`}
              className="mr-2 shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              文言編集
            </Link>
            <Link
              href={`/projects/${p.id}/announcements`}
              className="mr-4 shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              お知らせ管理
            </Link>
          </li>
        ))}
        {(projects ?? []).length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-neutral-500">
            まだ案件がありません。「＋ 新しいサイトを作る」から始めてください。
          </li>
        )}
      </ul>
    </main>
  );
}
