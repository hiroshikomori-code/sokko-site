import { advanceStep } from '@/app/projects/[id]/steps/review-actions';

/**
 * Step4: ビジュアル配置（§9-4）。
 * MVPは写真なしでも高品質に見えるテンプレ設計のため、確認のみで先へ進める。
 * 写真アップロード＋スロット割当はPhase 2（Supabase Storage連携）。
 */
export function Step4Visual({ projectId }: { projectId: string }) {
  const advance = advanceStep.bind(null, projectId, 4 as const);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">写真について</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          現在のバージョンでは、写真なしで公開できるデザインになっています
          （色とタイポグラフィで信頼感を担保）。
          お客様の写真・ロゴの配置機能は次のバージョンで追加予定です。
          写真を使いたい場合は、公開後にひろしさんへ相談してください。
        </p>
      </div>
      <form action={advance} className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          次へ（AEO/GEO確認）
        </button>
      </form>
    </div>
  );
}
