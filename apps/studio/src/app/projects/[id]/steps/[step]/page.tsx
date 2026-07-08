import Link from 'next/link';
import { redirect } from 'next/navigation';
import { META_PAGE_KEY } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { getProjectForStep, maxReachableStep } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { Stepper } from '@/components/stepper';
import { Step1Form } from '@/components/steps/step1-form';
import { Step2Template } from '@/components/steps/step2-template';
import { Step3Generate } from '@/components/steps/step3-generate';
import { Step4Visual } from '@/components/steps/step4-visual';
import { Step5Aeo } from '@/components/steps/step5-aeo';
import { Step6Review } from '@/components/steps/step6-review';
import { Step7Publish } from '@/components/steps/step7-publish';
import { Step8Delivery } from '@/components/steps/step8-delivery';
import type { QualityResult } from '@/lib/quality/gate';

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: {
    title: 'ヒアリング入力',
    description:
      'お客様から聞いた内容を入力してください。★印は仕上がりを決める大事な項目です。',
  },
  2: { title: 'テンプレート・デザイン選択', description: '業種の標準デザインから調整します。' },
  3: { title: 'コンテンツ自動生成', description: 'AIが全ページの文章を作成します。' },
  4: { title: 'ビジュアル配置', description: '写真の取り扱いを確認します。' },
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
  const supabase = await createClient();

  let content: React.ReactNode;
  switch (step) {
    case 1:
      content = (
        <Step1Form
          projectId={project.id}
          initialInput={project.input}
          readOnly={!['draft', 'revising'].includes(project.status)}
        />
      );
      break;
    case 2:
      content = (
        <Step2Template
          projectId={project.id}
          input={project.input}
          currentTemplateId={project.template_id}
        />
      );
      break;
    case 3:
      content = (
        <Step3Generate
          projectId={project.id}
          isGenerating={project.status === 'generating'}
          isRevising={project.status === 'revising'}
        />
      );
      break;
    case 4: {
      const { data: full } = await supabase
        .from('projects')
        .select('visuals')
        .eq('id', project.id)
        .single();
      content = (
        <Step4Visual
          projectId={project.id}
          initialVisuals={(full?.visuals ?? {}) as Record<string, string>}
          readOnly={project.status === 'generating'}
        />
      );
      break;
    }
    case 5: {
      const { data: metaPage } = await supabase
        .from('pages')
        .select('content')
        .eq('project_id', project.id)
        .eq('page_key', META_PAGE_KEY)
        .maybeSingle();
      content = (
        <Step5Aeo
          projectId={project.id}
          input={project.input}
          metaContent={metaPage?.content ?? null}
        />
      );
      break;
    }
    case 6: {
      const [{ data: check }, { data: pages }, { data: full }] = await Promise.all([
        supabase
          .from('quality_checks')
          .select('passed, result, checked_at')
          .eq('project_id', project.id)
          .order('checked_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('pages')
          .select('page_key, needs_revision')
          .eq('project_id', project.id)
          .order('page_key'),
        supabase
          .from('projects')
          .select('approved_at')
          .eq('id', project.id)
          .single(),
      ]);
      content = (
        <Step6Review
          projectId={project.id}
          role={user.role}
          status={project.status}
          previewUrl={project.preview_url}
          latestCheck={
            check
              ? {
                  passed: check.passed,
                  result: check.result as QualityResult,
                  checked_at: check.checked_at,
                }
              : null
          }
          pages={(pages ?? []) as { page_key: string; needs_revision: boolean }[]}
          approvedAt={full?.approved_at ?? null}
        />
      );
      break;
    }
    case 7: {
      const { data: full } = await supabase
        .from('projects')
        .select('approved_at')
        .eq('id', project.id)
        .single();
      content = (
        <Step7Publish
          projectId={project.id}
          status={project.status}
          approvedAt={full?.approved_at ?? null}
          deployUrl={project.deploy_url}
        />
      );
      break;
    }
    default:
      content = (
        <Step8Delivery
          projectId={project.id}
          deployUrl={project.deploy_url}
          input={project.input}
        />
      );
  }

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
          currentStep={maxReachableStep(project)}
          activeStep={step}
        />
      </div>

      <h1 className="mt-8 text-xl font-bold text-neutral-900">
        {step}. {meta.title}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{meta.description}</p>

      <div className="mt-6">{content}</div>
    </main>
  );
}
