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
    <nav aria-label="制作ステップ" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-xs">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const reachable = step <= currentStep;
          const isActive = step === activeStep;
          const base = 'flex items-center gap-1.5 rounded-full px-3 py-1.5';
          const style = isActive
            ? 'bg-neutral-900 text-white font-medium'
            : reachable
              ? 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
              : 'bg-neutral-100 text-neutral-400';

          const content = (
            <>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isActive ? 'bg-white text-neutral-900' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {step}
              </span>
              {label}
            </>
          );

          return (
            <li key={label}>
              {reachable ? (
                <Link
                  href={`/projects/${projectId}/steps/${step}`}
                  className={`${base} ${style}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {content}
                </Link>
              ) : (
                <span className={`${base} ${style}`}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
