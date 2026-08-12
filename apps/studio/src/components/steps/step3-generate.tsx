'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  META_PAGE_KEY,
  PAGE_LABELS,
  PAGE_PATHS,
  type PageKey,
} from '@sokko/shared';
import { createClient } from '@/lib/supabase/client';
import {
  completeGeneration,
  startGeneration,
} from '@/app/projects/[id]/steps/generation-actions';

type Job = {
  id: string;
  page_key: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  attempt: number;
  heartbeat_at: string | null;
  input_tokens: number;
  output_tokens: number;
  error: string | null;
};

const CONCURRENCY = 2;
const STALE_MS = 5 * 60 * 1000;

function labelOf(pageKey: string): string {
  if (pageKey === META_PAGE_KEY) return 'サイト全体メタ（FAQ・AI向け要約）';
  return PAGE_LABELS[pageKey as PageKey] ?? pageKey;
}

export function Step3Generate({
  projectId,
  isGenerating,
  isRevising,
  siteName,
}: {
  projectId: string;
  /** projects.status === 'generating' */
  isGenerating: boolean;
  /** projects.status === 'revising'（差し戻し対応中は再生成ボタンを出す） */
  isRevising: boolean;
  /** ライブ建設ビューの表示用（事業者名） */
  siteName: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);

  // ライブ建設ビュー: いま書き上がったページへ自動でプレビューを切り替える
  const [viewPath, setViewPath] = useState('/');
  const seenDoneRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const done = new Set(
      jobs.filter((j) => j.status === 'done').map((j) => j.page_key),
    );
    if (seenDoneRef.current === null) {
      // 初回は記録のみ（途中から開いたときに過去分へ飛ばない）
      if (jobs.length > 0) seenDoneRef.current = done;
      return;
    }
    const newlyDone = [...done].filter(
      (k) => !seenDoneRef.current!.has(k) && k !== META_PAGE_KEY,
    );
    if (newlyDone.length > 0) {
      const key = newlyDone[newlyDone.length - 1] as PageKey;
      setViewPath(PAGE_PATHS[key] ?? '/');
    }
    seenDoneRef.current = done;
  }, [jobs]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('generation_jobs')
      .select(
        'id, page_key, status, attempt, heartbeat_at, input_tokens, output_tokens, error',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (data) setJobs(data as Job[]);
    return (data ?? []) as Job[];
  }, [projectId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  /** ジョブ実行（並列度2）。失敗はポーリング表示に任せ、キューを止めない */
  const runJobs = useCallback(async (jobIds: string[]) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const queue = [...jobIds];
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, queue.length) },
        async () => {
          while (queue.length > 0) {
            const jobId = queue.shift();
            if (!jobId) break;
            try {
              await fetch('/api/generation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
              });
            } catch {
              // ネットワーク断など。ジョブはfailed/staleとして表示され再実行できる
            }
          }
        },
      );
      await Promise.all(workers);
    } finally {
      runningRef.current = false;
    }
  }, []);

  const onStart = () => {
    startTransition(async () => {
      setError(null);
      const result = await startGeneration(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const current = await refresh();
      const pendingIds = current
        .filter((j) => j.status === 'queued' || j.status === 'failed')
        .map((j) => j.id);
      await runJobs(result.jobIds.length > 0 ? result.jobIds : pendingIds);
      await refresh();
    });
  };

  const onRetry = (jobId: string) => {
    startTransition(async () => {
      await runJobs([jobId]);
      await refresh();
    });
  };

  const onComplete = () => {
    startTransition(async () => {
      setError(null);
      const result = await completeGeneration(projectId);
      if (result && !result.ok) setError(result.error);
    });
  };

  const isStale = (job: Job) =>
    job.status === 'running' &&
    job.heartbeat_at !== null &&
    Date.now() - new Date(job.heartbeat_at).getTime() > STALE_MS;

  const allDone = jobs.length > 0 && jobs.every((j) => j.status === 'done');
  const anyActive = jobs.some((j) => j.status === 'running' && !isStale(j));
  const totalTokens = jobs.reduce(
    (sum, j) => sum + j.input_tokens + j.output_tokens,
    0,
  );

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {jobs.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm text-neutral-600">
            ヒアリング内容をもとに、AIが全ページの文章を作成します。
            <br />
            生成された文章はAIが自己チェック（固有性・AEO・トーン・広告規制）してから保存されます。
          </p>
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="mt-6 btn-primary"
          >
            {pending ? '準備中…' : 'コンテンツ生成を開始'}
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,2fr)_5fr]">
        <div className="space-y-4">
          <ul className="card divide-y divide-neutral-200">
            {jobs.map((job) => {
              const stale = isStale(job);
              return (
                <li key={job.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {labelOf(job.page_key)}
                    </p>
                    {job.status === 'failed' && job.error && (
                      <p className="mt-0.5 max-w-md truncate text-xs text-red-600">
                        {job.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'done' && (
                      <span className="text-xs text-neutral-400">
                        {(job.input_tokens + job.output_tokens).toLocaleString()} tokens
                      </span>
                    )}
                    {job.status === 'queued' && (
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
                        待機中
                      </span>
                    )}
                    {job.status === 'running' && !stale && (
                      <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                        生成中
                      </span>
                    )}
                    {job.status === 'done' && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                        ✓ 完了
                      </span>
                    )}
                    {(job.status === 'failed' || stale) && (
                      <>
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
                          {stale ? '応答なし' : '失敗'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRetry(job.id)}
                          disabled={pending}
                          className="btn-secondary"
                        >
                          再実行
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              合計トークン: {totalTokens.toLocaleString()}
            </p>
            {allDone ? (
              <div className="flex items-center gap-3">
                {isRevising && (
                  <button
                    type="button"
                    onClick={onStart}
                    disabled={pending}
                    className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    差し戻し分を再生成
                  </button>
                )}
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={pending}
                  className="btn-primary"
                >
                  次へ（ビジュアル配置）
                </button>
              </div>
            ) : !anyActive && isGenerating ? (
              <button
                type="button"
                onClick={onStart}
                disabled={pending}
                className="btn-secondary"
              >
                続きを生成
              </button>
            ) : null}
          </div>
        </div>

        <LiveBuildPane
          projectId={projectId}
          siteName={siteName}
          homeDone={jobs.some((j) => j.page_key === 'home' && j.status === 'done')}
          doneCount={jobs.filter((j) => j.status === 'done').length}
          total={jobs.length}
          viewPath={viewPath}
        />
        </div>
      )}
    </div>
  );
}

/**
 * ライブ建設ビュー: 書き上がったページから実サイトの見た目そのままで
 * 組み上がっていく様子を表示する（ナビも完成ページだけが増えていく）。
 * ページ完成のたび（doneCountの変化）にドラフトプレビューを読み直す。
 */
function LiveBuildPane({
  projectId,
  siteName,
  homeDone,
  doneCount,
  total,
  viewPath,
}: {
  projectId: string;
  siteName: string;
  homeDone: boolean;
  doneCount: number;
  total: number;
  /** いま表示するページ（書き上がったページに自動で切り替わる） */
  viewPath: string;
}) {
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const pathSuffix = viewPath === '/' ? '' : viewPath;
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* ブラウザ風のヘッダー（デモ映え＋「実物である」ことの演出） */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
        <span aria-hidden className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <p className="min-w-0 flex-1 truncate text-center text-xs text-neutral-500">
          {siteName} — {homeDone ? 'いま組み上がっています' : '建設準備中'}
        </p>
        <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
          <span
            aria-hidden
            className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200"
          >
            <span
              className="block h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </span>
          {doneCount}/{total}
        </span>
      </div>
      {homeDone ? (
        <iframe
          key={`${viewPath}:${doneCount}`}
          src={`/projects/${projectId}/preview${pathSuffix}?embed=1&draft=1`}
          title="ライブ建設ビュー"
          className="h-[600px] w-full border-0 lg:h-[680px]"
        />
      ) : (
        <div className="flex h-[600px] flex-col items-center justify-center gap-4 bg-[#f5f6f8] px-6 text-center lg:h-[680px]">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg font-black text-white">
            AI
          </span>
          <p className="text-sm font-semibold text-neutral-700">
            {siteName} のサイトを建設中…
          </p>
          <p className="text-xs text-neutral-500">
            トップページが書き上がると、ここに実物が現れます
          </p>
        </div>
      )}
    </div>
  );
}
