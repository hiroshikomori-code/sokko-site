'use client';

import { useState, useTransition } from 'react';
import { advanceStep } from '@/app/projects/[id]/steps/review-actions';

/**
 * Step4/5の「次へ」ボタン。
 * フォーム送信型だと一部のブラウザ環境（拡張機能等）で送信自体が発生せず
 * 「押しても無反応」になる事象があったため、Server Actionを直接呼ぶ方式に統一。
 * 押下時の「処理中…」表示と失敗時のエラー表示を備える（無反応をなくす）。
 */
export function AdvanceButton({
  projectId,
  fromStep,
  label,
  disabled,
}: {
  projectId: string;
  fromStep: 4 | 5;
  label: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    startTransition(async () => {
      setError(null);
      try {
        await advanceStep(projectId, fromStep);
      } catch (err) {
        // redirect由来のエラーは正常系（Nextが画面遷移を処理する）
        const digest = (err as { digest?: string } | null)?.digest;
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
          return;
        }
        setError(
          '画面を進められませんでした。通信環境を確認して、もう一度お試しください',
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="btn-primary"
      >
        {pending ? '処理中…' : label}
      </button>
    </div>
  );
}
