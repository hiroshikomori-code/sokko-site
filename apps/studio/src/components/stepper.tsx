import Link from 'next/link';

const STEPS = [
  'ヒアリング入力',
  'テンプレ・デザイン',
  'ビジュアル配置',
  'コンテンツ生成',
  'AEO/GEO',
  'プレビュー・承認',
  '公開',
  '納品',
];

/** ナビ用の短縮ラベル（8ステップを1画面に収める。正式名はh1と title 属性で示す） */
const SHORT_LABELS = [
  'ヒアリング',
  'デザイン',
  '写真',
  '文章生成',
  'AEO',
  '確認・承認',
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
    <nav aria-label="制作ステップ">
      <ol className="grid grid-cols-8">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const reachable = step <= currentStep;
          const done = step < currentStep;
          const isActive = step === activeStep;

          const circle = isActive
            ? 'bg-amber-600 text-white ring-4 ring-amber-600/20'
            : done
              ? 'bg-amber-500 text-white'
              : reachable
                ? 'bg-white text-neutral-600 ring-1 ring-neutral-300'
                : 'bg-neutral-100 text-neutral-400';
          const text = isActive
            ? 'font-bold text-amber-700'
            : reachable
              ? 'text-neutral-600'
              : 'text-neutral-400';

          const content = (
            <>
              {/* 円と接続線（線は円の左右に伸ばし、到達済み区間だけ色を付ける） */}
              <span className="flex w-full items-center">
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i === 0 ? 'invisible' : reachable ? 'bg-amber-400' : 'bg-neutral-200'
                  }`}
                />
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${circle}`}
                >
                  {done ? '✓' : step}
                </span>
                <span
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    i === STEPS.length - 1
                      ? 'invisible'
                      : done
                        ? 'bg-amber-400'
                        : 'bg-neutral-200'
                  }`}
                />
              </span>
              <span
                className={`text-[11px] leading-tight whitespace-nowrap ${text} ${
                  isActive ? '' : 'hidden sm:block'
                }`}
              >
                {SHORT_LABELS[i]}
              </span>
            </>
          );

          return (
            <li key={label}>
              {reachable ? (
                <Link
                  href={`/projects/${projectId}/steps/${step}`}
                  title={label}
                  aria-current={isActive ? 'step' : undefined}
                  className="flex flex-col items-center gap-1.5 rounded-lg py-1 transition hover:bg-neutral-50"
                >
                  {content}
                </Link>
              ) : (
                <span
                  title={label}
                  className="flex flex-col items-center gap-1.5 py-1"
                >
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
