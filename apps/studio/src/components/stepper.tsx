import Link from 'next/link';

const STEPS = [
  'ヒアリング入力',
  'テンプレ・デザイン',
  'コンテンツ生成',
  'ビジュアル配置',
  'AEO/GEO',
  'プレビュー・承認',
  '公開',
  '納品',
];

export function Stepper({
  projectId,
  currentStep,
  activeStep,
}: {
  projectId: string;
  /** 案件が到達している最大ステップ */
  currentStep: number;
  /** いま表示中のステップ */
  activeStep: number;
}) {
  return (
    <nav aria-label="制作ステップ" className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const reachable = step <= currentStep;
          const done = step < currentStep;
          const isActive = step === activeStep;

          const pill = isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : reachable
              ? 'text-neutral-700 hover:bg-indigo-50'
              : 'text-neutral-400';
          const circle = isActive
            ? 'bg-white/25 text-white'
            : done
              ? 'bg-indigo-100 text-indigo-700'
              : reachable
                ? 'bg-white text-neutral-600 ring-1 ring-neutral-300'
                : 'bg-neutral-100 text-neutral-400';

          const content = (
            <>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${circle}`}
              >
                {done ? '✓' : step}
              </span>
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            </>
          );

          return (
            <li key={label} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`mx-1 h-px w-4 sm:w-6 ${
                    reachable ? 'bg-indigo-300' : 'bg-neutral-200'
                  }`}
                />
              )}
              {reachable ? (
                <Link
                  href={`/projects/${projectId}/steps/${step}`}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition ${pill}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {content}
                </Link>
              ) : (
                <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${pill}`}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
