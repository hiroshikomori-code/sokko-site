import {
  siteMetaContentSchema,
  type ProjectInputDraft,
} from '@sokko/shared';
import { advanceStep } from '@/app/projects/[id]/steps/review-actions';

/**
 * Step5: AEO/GEO自動最適化（§9-5）。
 * 常時ON・オペレーター非操作が堀。ここは「何が自動適用されているか」の確認画面。
 */
export function Step5Aeo({
  projectId,
  input,
  metaContent,
}: {
  projectId: string;
  input: ProjectInputDraft;
  metaContent: unknown;
}) {
  const advance = advanceStep.bind(null, projectId, 5 as const);
  const meta = siteMetaContentSchema.safeParse(metaContent);

  const items: { label: string; body: string }[] = [
    {
      label: '構造化データ（JSON-LD）',
      body: 'LegalService（事業情報）・FAQPage・Person（有資格者）を全ページに自動出力',
    },
    {
      label: 'AI回答エンジン向けファイル',
      body: 'llms.txt・sitemap.xml・robots.txt を自動生成',
    },
    {
      label: 'ポジショニング',
      body: input.aeo?.positioningStatement ?? '-',
    },
    {
      label: '織り込み検索語',
      body: (input.target?.searchKeywords ?? []).join('、') || '-',
    },
    {
      label: '商圏エリア',
      body: (input.aeo?.serviceAreaCities ?? []).join('、') || '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-medium text-emerald-900">
          ✓ AIに見つけてもらうための設定は、すべて自動で適用されています
        </p>
      </div>

      <dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <dt className="text-xs font-medium text-neutral-500">{item.label}</dt>
            <dd className="mt-1 text-sm text-neutral-900">{item.body}</dd>
          </div>
        ))}
        {meta.success && (
          <div className="px-5 py-4">
            <dt className="text-xs font-medium text-neutral-500">
              よくある質問（AI生成・FAQPage構造化データに使用）
            </dt>
            <dd className="mt-2 space-y-2">
              {meta.data.faq.map((f) => (
                <details key={f.question} className="text-sm">
                  <summary className="cursor-pointer text-neutral-900">
                    {f.question}
                  </summary>
                  <p className="mt-1 pl-4 text-neutral-600">{f.answer}</p>
                </details>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <form action={advance} className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          次へ（プレビュー・承認）
        </button>
      </form>
    </div>
  );
}
