import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ProjectInputDraft } from '@sokko/shared';

/**
 * Step2: テンプレ＆デザイン選択（§9-2）。
 * MVPは士業テンプレ1種のため「確認して確定」が主。カラーはStep1のF項で入力済み。
 * ブランドはテンプレ側で担保し、ここでの自由入力は設けない（§16）。
 */
export async function Step2Template({
  projectId,
  input,
  currentTemplateId,
}: {
  projectId: string;
  input: ProjectInputDraft;
  currentTemplateId: string | null;
}) {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from('templates')
    .select('id, industry, name, design_tokens, version')
    .order('created_at', { ascending: true });

  async function confirmTemplate(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const templateId = String(formData.get('templateId') ?? '');
    if (!templateId) return;

    const supabase = await createClient();
    const { data: project } = await supabase
      .from('projects')
      .select('current_step, status')
      .eq('id', projectId)
      .single();
    if (!project || !['draft', 'revising'].includes(project.status)) return;

    await supabase
      .from('projects')
      .update({
        template_id: templateId,
        current_step: Math.max(project.current_step, 3),
      })
      .eq('id', projectId);
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      project_id: projectId,
      action: 'template_selected',
      detail: { templateId },
    });
    redirect(`/projects/${projectId}/steps/3`);
  }

  const mainColor = input.mood?.mainColor ?? '#1e3a5f';

  return (
    <form action={confirmTemplate} className="space-y-4">
      {(templates ?? []).map((t) => (
        <label
          key={t.id}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-white p-6 has-[:checked]:border-neutral-900 has-[:checked]:ring-1 has-[:checked]:ring-neutral-900"
        >
          <div className="flex items-center gap-4">
            <input
              type="radio"
              name="templateId"
              value={t.id}
              defaultChecked={
                currentTemplateId ? t.id === currentTemplateId : true
              }
              className="h-4 w-4"
            />
            <div>
              <p className="font-medium text-neutral-900">{t.name}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                信頼・誠実トーンの士業標準デザイン（v{t.version}）
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">メインカラー</span>
            <span
              className="h-6 w-6 rounded-full border border-neutral-200"
              style={{ backgroundColor: mainColor }}
              title={mainColor}
            />
          </div>
        </label>
      ))}

      <p className="text-xs text-neutral-500">
        メインカラーはStep1「F. サイトの雰囲気」で設定した色が適用されます。
      </p>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          このテンプレートで次へ（コンテンツ生成）
        </button>
      </div>
    </form>
  );
}
