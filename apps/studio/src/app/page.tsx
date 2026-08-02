import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import { DeleteProjectButton } from '@/components/delete-project-button';

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  generating: '生成中',
  revising: '差し戻し対応中',
  review: 'レビュー待ち',
  published: '公開済み',
};

/** ステータスの色分け（一覧を眺めるだけで状況が分かるように） */
const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  generating: 'bg-blue-50 text-blue-700',
  revising: 'bg-red-50 text-red-700',
  review: 'bg-amber-50 text-amber-800',
  published: 'bg-emerald-50 text-emerald-700',
};

const STATUS_DOTS: Record<string, string> = {
  draft: 'bg-neutral-400',
  generating: 'bg-blue-500 animate-pulse',
  revising: 'bg-red-500',
  review: 'bg-amber-500',
  published: 'bg-emerald-500',
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
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white"
            >
              AI
            </span>
            <span className="text-[15px] font-bold tracking-tight text-neutral-900">
              AIホームページ制作ツール
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline">
              {user.name}
              <span className="ml-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {user.role === 'approver' ? '承認者' : 'オペレーター'}
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">案件一覧</h1>
            <p className="mt-1 text-sm text-neutral-500">
              作成中・公開中のホームページ {projects?.length ?? 0} 件
            </p>
          </div>
          <Link href="/projects/new" className="btn-primary">
            ＋ 新しいサイトを作る
          </Link>
        </div>

        <ul className="mt-6 space-y-3">
          {(projects ?? []).map((p) => (
            <li
              key={p.id}
              className="card flex items-center transition hover:border-indigo-300 hover:shadow-md"
            >
              <Link
                href={`/projects/${p.id}/steps/${p.current_step}`}
                className="flex min-w-0 flex-1 items-center gap-4 px-6 py-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-neutral-900">
                    {p.name}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`badge ${STATUS_BADGES[p.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[p.status] ?? 'bg-neutral-400'}`}
                      />
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-neutral-500">
                      <span
                        aria-hidden
                        className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200"
                      >
                        <span
                          className="block h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.round((p.current_step / 8) * 100)}%` }}
                        />
                      </span>
                      ステップ {p.current_step} / 8
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5 pr-5">
                <Link
                  href={`/projects/${p.id}/content`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  文言編集
                </Link>
                <Link
                  href={`/projects/${p.id}/announcements`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  お知らせ
                </Link>
                {p.status !== 'published' && (
                  <DeleteProjectButton projectId={p.id} name={p.name} />
                )}
              </div>
            </li>
          ))}
          {(projects ?? []).length === 0 && (
            <li className="card px-6 py-14 text-center text-sm text-neutral-500">
              まだ案件がありません。「＋ 新しいサイトを作る」から始めてください。
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
