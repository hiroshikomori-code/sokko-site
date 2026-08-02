'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCustomDomain } from '@/app/projects/[id]/steps/domain-actions';

/** 独自ドメイン設定（Step8）。適用は次回の本番公開時 */
export function DomainSettings({
  projectId,
  currentDomain,
}: {
  projectId: string;
  currentDomain: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSave = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await setCustomDomain(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(
        '保存しました。Step7「公開」からもう一度公開すると、独自ドメインが接続されます',
      );
      router.refresh();
    });
  };

  return (
    <section className="card p-6">
      <h3 className="text-sm font-bold text-neutral-900">独自ドメイン</h3>

      {(error || notice) && (
        <p
          role="status"
          className={`mt-3 rounded-md px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {error ?? notice}
        </p>
      )}

      <form action={onSave} className="mt-3 flex items-center gap-2">
        <input
          name="domain"
          type="text"
          defaultValue={currentDomain ?? ''}
          placeholder="例: suzuki-sr.jp"
          className="w-72 input"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? '保存中…' : '保存'}
        </button>
      </form>

      <div className="mt-3 space-y-1 text-xs text-neutral-500">
        <p>
          ※ 事前にお客様のドメインを<strong>Cloudflareアカウントにゾーン追加</strong>
          （ネームサーバーの切替）しておく必要があります — この作業はシステム管理者が担当。
        </p>
        <p>
          ※ 保存 → Step7で再公開、の順で適用されます（SSL証明書は自動発行）。
          空欄で保存するとドメイン接続を解除します。
        </p>
        {currentDomain && (
          <p className="text-emerald-700">
            現在の設定: <strong>{currentDomain}</strong>
          </p>
        )}
      </div>
    </section>
  );
}
