import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  DESIGN_VARIANTS,
  DESIGN_VARIANT_KEYS,
  INDUSTRY_TYPES,
  type DesignVariant,
  type IndustryType,
  type ProjectInputDraft,
} from '@sokko/shared';

/**
 * Step2: テンプレ＆デザイン選択（§9-2）。
 * 業種テンプレ（構造）＋デザインバリアント（見た目）の2軸を選ぶ。
 * バリアントは見た目のみの切替（構造・文章は共通＝壊せない設計）。
 * カラーはStep1のF項で入力済み。ここでの自由入力は設けない（§16）。
 */
export async function Step2Template({
  projectId,
  input,
  currentTemplateId,
  currentVariant,
}: {
  projectId: string;
  input: ProjectInputDraft;
  currentTemplateId: string | null;
  currentVariant: DesignVariant;
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
    const rawVariant = String(formData.get('variant') ?? 'classic');
    const variant = (DESIGN_VARIANT_KEYS as readonly string[]).includes(rawVariant)
      ? rawVariant
      : 'classic';
    if (!templateId) return;

    const supabase = await createClient();
    const { data: project } = await supabase
      .from('projects')
      .select('current_step, status, input')
      .eq('id', projectId)
      .single();
    if (!project || !['draft', 'revising'].includes(project.status)) return;

    // AI業種判定の修正（オペレーターがStep2で直した場合のみ反映）
    const rawPreset = String(formData.get('industryPreset') ?? '');
    const rawLabel = String(formData.get('industryLabel') ?? '')
      .trim()
      .slice(0, 40);
    const nextInput = project.input as {
      basics?: { industryType?: string; industryLabel?: string };
    };
    if (nextInput.basics) {
      if (rawPreset in INDUSTRY_TYPES) nextInput.basics.industryType = rawPreset;
      if (rawLabel) nextInput.basics.industryLabel = rawLabel;
    }

    await supabase
      .from('projects')
      .update({
        template_id: templateId,
        design_variant: variant,
        input: nextInput,
        current_step: Math.max(project.current_step, 3),
      })
      .eq('id', projectId);
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      project_id: projectId,
      action: 'template_selected',
      detail: { templateId, variant },
    });
    redirect(`/projects/${projectId}/steps/3`);
  }

  const mainColor = input.mood?.mainColor ?? '#1e3a5f';
  const detectedPreset = (input.basics?.industryType ?? 'generic') as IndustryType;
  const detectedLabel =
    input.basics?.industryLabel ?? INDUSTRY_TYPES[detectedPreset];

  return (
    <form action={confirmTemplate} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          業種（AIがヒアリング内容から判定）
        </h3>
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-900">
            判定結果:{' '}
            <span className="font-bold">{detectedLabel}</span>
            <span className="ml-2 text-xs text-neutral-500">
              （プリセット: {INDUSTRY_TYPES[detectedPreset]}）
            </span>
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-neutral-600">
              サイトに表示する業種名（肩書き「◯◯市の△△」の△△）
              <input
                name="industryLabel"
                type="text"
                defaultValue={detectedLabel}
                maxLength={40}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="block text-xs text-neutral-600">
              言葉づかいのプリセット（違っていれば変更）
              <select
                name="industryPreset"
                defaultValue={detectedPreset}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                {Object.entries(INDUSTRY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            判定が合っていれば何もしなくてOKです。ここの内容がナビの言葉づかい・検索エンジン向け情報に反映されます。
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">業種テンプレート</h3>
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
                  士業標準のページ構成（v{t.version}）
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
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">デザイン</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {DESIGN_VARIANT_KEYS.map((key) => (
            <label
              key={key}
              className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 has-[:checked]:border-neutral-900 has-[:checked]:ring-1 has-[:checked]:ring-neutral-900"
            >
              <VariantThumb variant={key} mainColor={mainColor} />
              <div className="mt-3 flex items-start gap-2.5">
                <input
                  type="radio"
                  name="variant"
                  value={key}
                  defaultChecked={key === currentVariant}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {DESIGN_VARIANTS[key].label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    {DESIGN_VARIANTS[key].description}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          デザインは公開後でも変更できます（ここで選び直し →
          Step7「変更を再公開する」）。文章・ページ構成はどれを選んでも同じです。
        </p>
      </section>

      <p className="text-xs text-neutral-500">
        メインカラーはStep1「F. サイトの雰囲気」で設定した色が適用されます。
      </p>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          このデザインで次へ（コンテンツ生成）
        </button>
      </div>
    </form>
  );
}

/** バリアントのミニプレビュー（雰囲気が一目で分かる静的サムネイル） */
function VariantThumb({
  variant,
  mainColor,
}: {
  variant: DesignVariant;
  mainColor: string;
}) {
  if (variant === 'future') {
    return (
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-[#0c0f16] p-3">
        <div
          className="h-1 w-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${mainColor}, #67e8f9)`,
          }}
        />
        <p className="mt-3 text-[13px] font-black leading-snug text-white">
          その先の、標準へ。
        </p>
        <div className="mt-2 h-1.5 w-3/4 rounded bg-white/20" />
        <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20" />
        <span
          className="mt-3 inline-block rounded-md px-3 py-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: mainColor }}
        >
          相談する
        </span>
      </div>
    );
  }
  if (variant === 'warm') {
    return (
      <div className="overflow-hidden rounded-lg border border-[#efe5d6] bg-[#faf3e9] p-3">
        <div className="h-1 w-8 rounded-full bg-[#f2c078]" />
        <p className="mt-3 text-[13px] font-bold leading-snug text-[#3a352e]">
          ようこそ、私たちの店へ
        </p>
        <div className="mt-2 h-1.5 w-3/4 rounded-full bg-[#e5d9c5]" />
        <div className="mt-1 h-1.5 w-1/2 rounded-full bg-[#e5d9c5]" />
        <span
          className="mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: mainColor }}
        >
          相談する
        </span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[#e7e2d7] bg-[#f6f3ec] p-3">
      <div className="h-px w-10 bg-[#bfa268]" />
      <p className="mt-3 font-serif text-[13px] font-semibold leading-snug text-[#211d16]">
        信頼に、応える。
      </p>
      <div className="mt-2 h-1.5 w-3/4 bg-[#e7e2d7]" />
      <div className="mt-1 h-1.5 w-1/2 bg-[#e7e2d7]" />
      <span
        className="mt-3 inline-block rounded-sm px-3 py-1 text-[10px] font-bold text-white"
        style={{ backgroundColor: mainColor }}
      >
        相談する
      </span>
    </div>
  );
}
