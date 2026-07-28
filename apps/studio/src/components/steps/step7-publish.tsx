'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { deployProduction } from '@/app/projects/[id]/steps/review-actions';
import { Spinner, useDeployWatcher } from './step6-review';

export function Step7Publish({
  projectId,
  status,
  approvedAt,
  deployUrl,
}: {
  projectId: string;
  status: string;
  approvedAt: string | null;
  deployUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deployingSince, setDeployingSince] = useState<string | null>(null);

  useDeployWatcher(
    projectId,
    'production',
    deployingSince,
    () => {
      setDeployingSince(null);
      setNotice('公開が完了しました');
      router.refresh();
    },
    () => {
      setDeployingSince(null);
      setError(
        '公開の完了を確認できませんでした。数分おいて再読み込みしてください',
      );
    },
  );

  const onDeploy = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await deployProduction(projectId);
      if (!result.ok) setError(result.error);
      else setDeployingSince(new Date().toISOString());
    });
  };
  const requested = !!deployingSince;

  const published = status === 'published' && !!deployUrl;

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <p
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {error ?? notice}
        </p>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        {published ? (
          <>
            <p className="text-2xl">🎉</p>
            <h3 className="mt-2 text-lg font-bold text-neutral-900">公開されました</h3>
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-blue-700 underline"
            >
              {deployUrl}
            </a>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onDeploy}
                disabled={pending || requested}
                className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                {requested ? (
                  <span className="flex items-center gap-2">
                    <Spinner />
                    再公開中…（1〜3分・完了すると自動で更新されます）
                  </span>
                ) : (
                  '変更を再公開する'
                )}
              </button>
              <Link
                href={`/projects/${projectId}/steps/8`}
                className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                納品情報へ
              </Link>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              文言編集・写真差し替え・独自ドメイン設定の反映は「変更を再公開する」で行います
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-neutral-900">本番公開</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {approvedAt
                ? '承認済みです。ボタン一つで公開されます。'
                : 'Step6で承認を得ると公開できます。'}
            </p>
            <button
              type="button"
              onClick={onDeploy}
              disabled={pending || !approvedAt || requested}
              className="mt-6 rounded-md bg-neutral-900 px-8 py-3 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              {requested ? (
                <span className="flex items-center gap-2">
                  <Spinner light />
                  公開処理中…（1〜3分）
                </span>
              ) : (
                'サイトを公開する'
              )}
            </button>
            {requested && (
              <p className="mt-3 text-xs text-neutral-500">
                サイトを組み立てて公開しています。完了すると自動でこの画面に公開URLが表示されます
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
