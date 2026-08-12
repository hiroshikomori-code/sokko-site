'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PAGE_LABELS, type PageKey } from '@sokko/shared';
import {
  approveProject,
  checkDeployCompleted,
  deployPreview,
  rejectProject,
} from '@/app/projects/[id]/steps/review-actions';
import type { QualityResult } from '@/lib/quality/gate';

/** デプロイ中などの進行表示用スピナー */
export function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 ${
        light
          ? 'border-white/30 border-t-white'
          : 'border-neutral-300 border-t-neutral-700'
      }`}
    />
  );
}

/**
 * デプロイ完了の自動検知フック。
 * sinceIso がセットされている間、10秒ごとに完了を確認し、
 * 完了したら onDone を呼ぶ（8分で諦めて onTimeout）。
 */
export function useDeployWatcher(
  projectId: string,
  env: 'preview' | 'production',
  sinceIso: string | null,
  onDone: () => void,
  onTimeout: () => void,
) {
  useEffect(() => {
    if (!sinceIso) return;
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > 8 * 60 * 1000) {
        clearInterval(timer);
        onTimeout();
        return;
      }
      try {
        const { done } = await checkDeployCompleted(projectId, env, sinceIso);
        if (done) {
          clearInterval(timer);
          onDone();
        }
      } catch {
        // 一時的な通信失敗は次のポーリングで再試行
      }
    }, 10_000);
    return () => clearInterval(timer);
    // onDone/onTimeout は最新のstateを閉じ込めるため意図的に依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, env, sinceIso]);
}

type PageInfo = { page_key: string; needs_revision: boolean };

export function Step6Review({
  projectId,
  role,
  status,
  previewUrl,
  latestCheck,
  pages,
  approvedAt,
}: {
  projectId: string;
  role: 'operator' | 'approver';
  status: string;
  previewUrl: string | null;
  latestCheck: { passed: boolean; result: QualityResult; checked_at: string } | null;
  pages: PageInfo[];
  approvedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectPages, setRejectPages] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState('');

  const [deployingSince, setDeployingSince] = useState<string | null>(null);

  useDeployWatcher(
    projectId,
    'preview',
    deployingSince,
    () => {
      setDeployingSince(null);
      setMessage('プレビューのデプロイが完了しました。URLから確認できます');
      router.refresh();
    },
    () => {
      setDeployingSince(null);
      setError(
        'デプロイの完了を確認できませんでした。数分おいて再読み込みし、URLが出ていなければもう一度お試しください',
      );
    },
  );

  const onDeployPreview = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await deployPreview(projectId);
      if (!result.ok) {
        setError(result.error ?? 'エラーが発生しました');
        return;
      }
      setDeployingSince(new Date().toISOString());
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | never>) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await fn();
      if (result && !result.ok) setError(result.error ?? 'エラーが発生しました');
      else router.refresh();
    });
  };

  const onRunCheck = async () => {
    setChecking(true);
    setError(null);
    setMessage('品質チェックを実行中です（2〜3分かかります）…');
    try {
      const res = await fetch('/api/quality/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'チェックに失敗しました');
      else setMessage(data.passed ? '品質チェックに合格しました' : '要修正の項目があります');
      router.refresh();
    } catch {
      setError('チェックの実行に失敗しました');
    } finally {
      setChecking(false);
    }
  };

  const findings = latestCheck?.result?.findings ?? [];
  const psi = latestCheck?.result?.psi ?? [];
  const revisionPages = pages.filter((p) => p.needs_revision);

  return (
    <div className="space-y-6">
      {(message || error) && (
        <p
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
        >
          {error ?? message}
        </p>
      )}

      {status === 'revising' && revisionPages.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-900">差し戻し対応中</p>
          <p className="mt-1 text-xs text-amber-800">
            対象:{' '}
            {revisionPages
              .map((p) => PAGE_LABELS[p.page_key as PageKey] ?? p.page_key)
              .join('、')}
            <br />
            Step4で対象ページを再生成してから、再度プレビューをデプロイしてください。
          </p>
        </div>
      )}

      {/* 1. プレビュー */}
      <section className="card p-6">
        <h3 className="text-sm font-bold text-neutral-900">1. 実機プレビュー</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onDeployPreview}
            disabled={pending || !!deployingSince}
            className="btn-primary"
          >
            {deployingSince ? (
              <span className="flex items-center gap-2">
                <Spinner light />
                デプロイ中…
              </span>
            ) : (
              'プレビューをデプロイ'
            )}
          </button>
          {deployingSince ? (
            <span className="flex items-center gap-2 text-xs text-neutral-600">
              <Spinner />
              サイトを組み立てて配信環境に反映しています（1〜3分）。完了すると自動でURLが表示されます
            </span>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700 underline"
            >
              {previewUrl}
            </a>
          ) : (
            <span className="text-xs text-neutral-500">
              デプロイには数分かかります（進行状況はこの画面に表示されます）
            </span>
          )}
          <Link
            href={`/projects/${projectId}/preview`}
            className="text-sm text-neutral-500 underline"
            target="_blank"
          >
            簡易プレビュー（studio内）
          </Link>
        </div>
      </section>

      {/* 2. 品質チェック */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">2. 自動品質チェック</h3>
          <button
            type="button"
            onClick={onRunCheck}
            disabled={checking || !previewUrl}
            className="btn-secondary"
          >
            {checking ? '実行中…' : 'チェックを実行'}
          </button>
        </div>

        {latestCheck ? (
          <div className="mt-4 space-y-4">
            <p
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                latestCheck.passed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {latestCheck.passed ? '✓ 合格' : '✗ 要修正'}
              （{new Date(latestCheck.checked_at).toLocaleString('ja-JP')}）
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {psi.map((score) => (
                <div
                  key={score.path}
                  className="rounded-md border border-neutral-200 px-4 py-3 text-sm"
                >
                  <p className="text-xs text-neutral-500">{score.path}</p>
                  <p className="mt-1">
                    表示速度: <strong>{score.performance ?? '計測不可'}</strong>
                    <span className="mx-2 text-neutral-300">|</span>
                    アクセシビリティ: <strong>{score.accessibility ?? '計測不可'}</strong>
                  </p>
                </div>
              ))}
            </div>

            {findings.length > 0 && (
              <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 px-4 py-2.5">
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        f.level === 'block'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {f.level === 'block' ? '要修正' : '警告'}
                    </span>
                    <span className="text-neutral-700">
                      <span className="mr-2 text-xs text-neutral-400">{f.path}</span>
                      {f.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-neutral-500">
            プレビューのデプロイ後にチェックを実行してください。
            速度・アクセシビリティ・リンク切れ・メタ情報・構造化データ・広告規制表現を機械チェックします。
          </p>
        )}
      </section>

      {/* 3. 承認（承認者のみ操作可能） */}
      <section className="card p-6">
        <h3 className="text-sm font-bold text-neutral-900">3. 承認</h3>
        {approvedAt ? (
          <p className="mt-3 text-sm text-emerald-700">
            ✓ 承認済み（{new Date(approvedAt).toLocaleString('ja-JP')}）— Step7で公開できます
          </p>
        ) : role !== 'approver' ? (
          <p className="mt-3 text-sm text-neutral-500">
            承認者がプレビューと品質チェックの結果を確認し、承認すると公開に進めます。
            承認者にこのページのURLを共有してください。
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => run(() => approveProject(projectId))}
                disabled={pending || !latestCheck?.passed || status !== 'review'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
              >
                承認して公開へ進む
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen((v) => !v)}
                disabled={pending || status !== 'review'}
                className="rounded-md border border-red-300 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                差し戻す
              </button>
            </div>
            {!latestCheck?.passed && (
              <p className="text-xs text-neutral-500">
                ※ 品質チェックに合格すると承認ボタンが有効になります
              </p>
            )}

            {rejectOpen && (
              <div className="rounded-md border border-red-200 bg-red-50/50 p-4">
                <p className="text-xs font-medium text-neutral-700">
                  差し戻すページ（複数選択可）
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {pages
                    .filter((p) => !p.page_key.startsWith('_'))
                    .map((p) => (
                      <label key={p.page_key} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={rejectPages.includes(p.page_key)}
                          onChange={(e) =>
                            setRejectPages((prev) =>
                              e.target.checked
                                ? [...prev, p.page_key]
                                : prev.filter((k) => k !== p.page_key),
                            )
                          }
                        />
                        {PAGE_LABELS[p.page_key as PageKey] ?? p.page_key}
                      </label>
                    ))}
                </div>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="差し戻し理由（必須）。AIがこのコメントを反映して書き直します"
                  className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    run(async () => {
                      const result = await rejectProject(projectId, rejectPages, rejectNote);
                      if (result.ok) {
                        setRejectOpen(false);
                        setRejectPages([]);
                        setRejectNote('');
                      }
                      return result;
                    })
                  }
                  disabled={pending}
                  className="mt-3 btn-danger"
                >
                  差し戻しを確定
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
