'use client';

import { useState, useTransition } from 'react';
import { DESIGN_VARIANTS } from '@sokko/shared';
import type { DesignProposal } from '@/lib/design-concierge';
import { suggestDesignForProject } from '@/app/projects/[id]/steps/actions';

/**
 * AIデザインコンシェルジュ（Step2）。
 * 3案の提案カードを表示し、「この案にする」でデザインのラジオと
 * 提案カラー（hidden input）を選択状態にする。保存は「確定して次へ」で行う。
 * フォーム本体はサーバーコンポーネントの非制御inputなので、DOM経由で選択する。
 */
export function DesignConcierge({ projectId }: { projectId: string }) {
  const [proposals, setProposals] = useState<DesignProposal[] | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSuggest = () => {
    startTransition(async () => {
      setError(null);
      setApplied(null);
      const result = await suggestDesignForProject(projectId);
      if (result.ok) setProposals(result.proposals);
      else setError(result.error);
    });
  };

  const onApply = (p: DesignProposal, index: number) => {
    const radio = document.querySelector<HTMLInputElement>(
      `input[name="variant"][value="${p.variant}"]`,
    );
    if (radio) radio.checked = true;
    const color = document.querySelector<HTMLInputElement>(
      'input[name="proposedMainColor"]',
    );
    if (color) color.value = p.mainColor;
    setApplied(index);
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">
            AIデザイン提案
            <span className="ml-2 rounded-md bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              AI
            </span>
          </h4>
          <p className="mt-0.5 text-xs text-neutral-500">
            ヒアリング内容から、デザインと色の組合せを根拠付きで3案提案します
          </p>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={pending}
          className="btn-secondary"
        >
          {pending ? '提案を作成中…（10〜20秒）' : proposals ? 'もう一度提案' : '提案してもらう'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {proposals && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {proposals.map((p, i) => (
            <div
              key={i}
              className={`rounded-xl border bg-white p-4 transition ${
                applied === i
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-neutral-200'
              }`}
            >
              <p className="text-xs font-bold text-amber-700">
                {i === 0 ? '最有力' : i === 1 ? '差別化' : '意外な選択肢'}
              </p>
              <p className="mt-1 text-sm font-bold text-neutral-900">{p.title}</p>
              <p className="mt-1.5 flex items-center gap-2 text-xs text-neutral-600">
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full border border-neutral-200"
                  style={{ backgroundColor: p.mainColor }}
                />
                {DESIGN_VARIANTS[p.variant].label} × {p.mainColor}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {p.reason}
              </p>
              <button
                type="button"
                onClick={() => onApply(p, i)}
                className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  applied === i
                    ? 'bg-amber-600 text-white'
                    : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {applied === i ? '✓ この案を選択中' : 'この案にする'}
              </button>
            </div>
          ))}
        </div>
      )}

      {applied !== null && (
        <p className="mt-3 text-xs text-neutral-500">
          下のデザイン選択に反映しました。「このデザインで次へ」で確定するとメインカラーも更新されます。
        </p>
      )}
    </div>
  );
}
