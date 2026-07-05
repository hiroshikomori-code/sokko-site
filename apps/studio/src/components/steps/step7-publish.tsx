'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { deployProduction } from '@/app/projects/[id]/steps/review-actions';

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
  const [requested, setRequested] = useState(false);

  const onDeploy = () => {
    startTransition(async () => {
      setError(null);
      const result = await deployProduction(projectId);
      if (!result.ok) setError(result.error);
      else {
        setRequested(true);
        router.refresh();
      }
    });
  };

  const published = status === 'published' && !!deployUrl;

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
            <div className="mt-6">
              <Link
                href={`/projects/${projectId}/steps/8`}
                className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                納品情報へ
              </Link>
            </div>
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
              {requested ? '公開処理中…（数分かかります）' : 'サイトを公開する'}
            </button>
            {requested && (
              <p className="mt-3 text-xs text-neutral-500">
                完了すると自動でこのページに公開URLが表示されます。ページを再読み込みして確認してください。
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
