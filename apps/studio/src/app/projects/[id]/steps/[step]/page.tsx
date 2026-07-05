import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProjectForStep } from '@/lib/projects';
import { Stepper } from '@/components/stepper';
import { Step1Form } from '@/components/steps/step1-form';
import { Step2Template } from '@/components/steps/step2-template';
import { Step3Generate } from '@/components/steps/step3-generate';

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: {
    title: 'ヒアリング入力',
    description:
      'お客様から聞いた内容を入力してください。★印は仕上がりを決める大事な項目です。',
  },
  2: { title: 'テンプレート・デザイン選択', description: '業種の標準デザインから調整します。' },
  3: { title: 'コンテンツ自動生成', description: 'AIが全ページの文章を作成します。' },
  4: { title: 'ビジュアル配置', description: '写真をアップロードして配置します。' },
  5: { title: 'AEO/GEO最適化', description: 'AIに見つけてもらう設定は自動で適用されています。' },
  6: { title: 'プレビュー・品質チェック・承認', description: '公開前の最終確認です。' },
  7: { title: '公開', description: '承認済みのサイトを公開します。' },
  8: { title: '納品', description: '公開URLと運用マニュアルをお渡しします。' },
};

export default async function StepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id, step: stepParam } = await params;
  const step = Number(stepParam);
  if (!Number.isInteger(step) || step < 1 || step > 8) {
    redirect(`/projects/${id}/steps/1`);
  }

  const project = await getProjectForStep(id, step);
  const meta = STEP_TITLES[step];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← 案件一覧
        </Link>
        <p className="text-sm font-medium text-neutral-700">{project.name}</p>
      </div>

      <div className="mt-4">
        <Stepper
          projectId={project.id}
          currentStep={project.current_step}
          activeStep={step}
        />
      </div>

      <h1 className="mt-8 text-xl font-bold text-neutral-900">
        {step}. {meta.title}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{meta.description}</p>

      <div className="mt-6">
        {step === 1 ? (
          <Step1Form
            projectId={project.id}
            initialInput={project.input}
            readOnly={!['draft', 'revising'].includes(project.status)}
          />
        ) : step === 2 ? (
          <Step2Template
            projectId={project.id}
            input={project.input}
            currentTemplateId={project.template_id}
          />
        ) : step === 3 ? (
          <Step3Generate
            projectId={project.id}
            isGenerating={project.status === 'generating'}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center text-sm text-neutral-400">
            このステップは実装中です（タスク#{step >= 6 ? 6 : step}で実装予定）
          </div>
        )}
      </div>
    </main>
  );
}
