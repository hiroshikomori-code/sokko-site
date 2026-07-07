'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { META_PAGE_KEY, PAGE_LABELS, type PageKey } from '@sokko/shared';
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
}: {
  projectId: string;
  /** projects.status === 'generating' */
  isGenerating: boolean;
  /** projects.status === 'revising'（差し戻し対応中は再生成ボタンを出す） */
  isRevising: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const runningRef = useRef(false);

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
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-neutral-600">
            ヒアリング内容をもとに、AIが全ページの文章を作成します。
            <br />
            生成された文章はAIが自己チェック（固有性・AEO・トーン・広告規制）してから保存されます。
          </p>
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="mt-6 rounded-md bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {pending ? '準備中…' : 'コンテンツ生成を開始'}
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
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
                          className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
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
                  className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  次へ（ビジュアル配置）
                </button>
              </div>
            ) : !anyActive && isGenerating ? (
              <button
                type="button"
                onClick={onStart}
                disabled={pending}
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                続きを生成
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
