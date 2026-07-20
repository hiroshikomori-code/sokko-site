'use client';

import { useState, useTransition } from 'react';
import { useForm, type Path } from 'react-hook-form';
import {
  CTA_TYPES,
  DEFAULT_PAGE_KEYS,
  PAGE_LABELS,
  TONES,
  type ProjectInputDraft,
} from '@sokko/shared';
import {
  draftStep1FromMemo,
  saveStep1Draft,
  submitStep1,
} from '@/app/projects/[id]/steps/actions';
import type { Step1DraftSuggestion } from '@/lib/step1-drafter';

/** フォーム内部の値（未入力を許容し、確定時に共有スキーマで検証する） */
type FormValues = {
  basics: {
    officeName: string;
    officeNameKana: string;
    industryType: string;
    businessSummary: string;
    address: string;
    serviceAreaText: string;
    phone: string;
    businessHours: string;
    closedDays: string;
    foundedYear: string;
    representativeName: string;
    existingSiteUrl: string;
  };
  strengths: {
    strengths: [string, string, string];
    differentiator: string;
    foundingStory: string;
    achievements: string;
    certifications: string;
  };
  target: {
    customerProfile: string;
    customerNeeds: string;
    searchKeywordsText: string; // 改行・読点区切り → 配列へ変換
  };
  cta: { primaryAction: string; bookingToolUrl: string };
  pages: { pageKeys: string[] };
  mood: { tone: string; mainColor: string; referenceUrl1: string; referenceUrl2: string };
  assets: { hasLogo: boolean; photoCount: number; pamphletNote: string };
  aeo: {
    serviceAreaCitiesText: string; // 改行・読点区切り → 配列へ変換
    hasGbp: boolean;
    gbpUrl: string;
    positioningStatement: string;
    competitor1: string;
    competitor2: string;
  };
  operation: {
    domainType: string;
    domainName: string;
    desiredLaunchDate: string;
    approverEmail: string;
    updateFrequency: string;
    updateOwner: string;
  };
};

function splitList(text: string): string[] {
  return text
    .split(/[\n、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toDefaults(input: ProjectInputDraft): FormValues {
  return {
    basics: {
      officeName: input.basics?.officeName ?? '',
      officeNameKana: input.basics?.officeNameKana ?? '',
      industryType: input.basics?.industryType ?? '',
      businessSummary: input.basics?.businessSummary ?? '',
      address: input.basics?.address ?? '',
      serviceAreaText: input.basics?.serviceAreaText ?? '',
      phone: input.basics?.phone ?? '',
      businessHours: input.basics?.businessHours ?? '',
      closedDays: input.basics?.closedDays ?? '',
      foundedYear: input.basics?.foundedYear ?? '',
      representativeName: input.basics?.representativeName ?? '',
      existingSiteUrl: input.basics?.existingSiteUrl ?? '',
    },
    strengths: {
      strengths: [
        input.strengths?.strengths?.[0] ?? '',
        input.strengths?.strengths?.[1] ?? '',
        input.strengths?.strengths?.[2] ?? '',
      ],
      differentiator: input.strengths?.differentiator ?? '',
      foundingStory: input.strengths?.foundingStory ?? '',
      achievements: input.strengths?.achievements ?? '',
      certifications: input.strengths?.certifications ?? '',
    },
    target: {
      customerProfile: input.target?.customerProfile ?? '',
      customerNeeds: input.target?.customerNeeds ?? '',
      searchKeywordsText: (input.target?.searchKeywords ?? []).join('\n'),
    },
    cta: {
      primaryAction: input.cta?.primaryAction ?? '',
      bookingToolUrl: input.cta?.bookingToolUrl ?? '',
    },
    pages: { pageKeys: input.pages?.pageKeys ?? [...DEFAULT_PAGE_KEYS] },
    mood: {
      tone: input.mood?.tone ?? '',
      mainColor: input.mood?.mainColor ?? '#1e3a5f',
      referenceUrl1: input.mood?.referenceUrls?.[0] ?? '',
      referenceUrl2: input.mood?.referenceUrls?.[1] ?? '',
    },
    assets: {
      hasLogo: input.assets?.hasLogo ?? false,
      photoCount: input.assets?.photoCount ?? 0,
      pamphletNote: input.assets?.pamphletNote ?? '',
    },
    aeo: {
      serviceAreaCitiesText: (input.aeo?.serviceAreaCities ?? []).join('\n'),
      hasGbp: input.aeo?.hasGbp ?? false,
      gbpUrl: input.aeo?.gbpUrl ?? '',
      positioningStatement: input.aeo?.positioningStatement ?? '',
      competitor1: input.aeo?.competitors?.[0] ?? '',
      competitor2: input.aeo?.competitors?.[1] ?? '',
    },
    operation: {
      domainType: input.operation?.domainType ?? '',
      domainName: input.operation?.domainName ?? '',
      desiredLaunchDate: input.operation?.desiredLaunchDate ?? '',
      approverEmail: input.operation?.approverEmail ?? '',
      updateFrequency: input.operation?.updateFrequency ?? '',
      updateOwner: input.operation?.updateOwner ?? '',
    },
  };
}

/** フォーム値 → 共有スキーマ（ProjectInput）の形へ変換 */
function toInput(v: FormValues) {
  return {
    basics: {
      ...v.basics,
      // 業種はフォームで選ばせない（空文字はスキーマdefault=genericに落とす。確定時にAIが上書き）
      industryType: v.basics.industryType || undefined,
      foundedYear: v.basics.foundedYear || undefined,
      representativeName: v.basics.representativeName || undefined,
      existingSiteUrl: v.basics.existingSiteUrl || undefined,
      snsUrls: [],
    },
    strengths: {
      strengths: v.strengths.strengths,
      differentiator: v.strengths.differentiator,
      foundingStory: v.strengths.foundingStory || undefined,
      achievements: v.strengths.achievements || undefined,
      certifications: v.strengths.certifications || undefined,
    },
    target: {
      customerProfile: v.target.customerProfile,
      customerNeeds: v.target.customerNeeds,
      searchKeywords: splitList(v.target.searchKeywordsText),
    },
    cta: {
      primaryAction: v.cta.primaryAction,
      bookingToolUrl: v.cta.bookingToolUrl || undefined,
    },
    pages: { pageKeys: v.pages.pageKeys },
    mood: {
      tone: v.mood.tone,
      mainColor: v.mood.mainColor,
      referenceUrls: [v.mood.referenceUrl1, v.mood.referenceUrl2].filter(Boolean),
    },
    assets: {
      hasLogo: v.assets.hasLogo,
      photoCount: Number(v.assets.photoCount) || 0,
      pamphletNote: v.assets.pamphletNote || undefined,
    },
    aeo: {
      serviceAreaCities: splitList(v.aeo.serviceAreaCitiesText),
      hasGbp: v.aeo.hasGbp,
      gbpUrl: v.aeo.gbpUrl || undefined,
      positioningStatement: v.aeo.positioningStatement,
      competitors: [v.aeo.competitor1, v.aeo.competitor2].filter(Boolean),
    },
    operation: {
      domainType: v.operation.domainType,
      domainName: v.operation.domainName || undefined,
      desiredLaunchDate: v.operation.desiredLaunchDate,
      approverEmail: v.operation.approverEmail,
      updateFrequency: v.operation.updateFrequency || undefined,
      updateOwner: v.operation.updateOwner || undefined,
    },
  };
}

/** サーバーからのエラーパス（共有スキーマ基準）→ フォームのフィールドパスへ */
const ERROR_PATH_MAP: Record<string, Path<FormValues>> = {
  'target.searchKeywords': 'target.searchKeywordsText',
  'mood.referenceUrls': 'mood.referenceUrl1',
  'aeo.serviceAreaCities': 'aeo.serviceAreaCitiesText',
};

export function Step1Form({
  projectId,
  initialInput,
  readOnly,
}: {
  projectId: string;
  initialInput: ProjectInputDraft;
  readOnly: boolean;
}) {
  const form = useForm<FormValues>({ defaultValues: toDefaults(initialInput) });
  const { register, handleSubmit, setError, formState, getValues } = form;
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');

  const err = (path: string): string | undefined => {
    const parts = path.split('.');
    let node: unknown = formState.errors;
    for (const p of parts) {
      if (!node || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[p];
    }
    return (node as { message?: string } | undefined)?.message;
  };

  const onSaveDraft = () => {
    startTransition(async () => {
      setTopError(null);
      const result = await saveStep1Draft(projectId, toInput(getValues()));
      setNotice(result.ok ? '下書きを保存しました' : null);
      if (!result.ok) setTopError(result.error);
      setTimeout(() => setNotice(null), 3000);
    });
  };

  /** AI下書きを空欄にだけ流し込む（入力済みの欄は上書きしない） */
  const applyDraft = (d: Step1DraftSuggestion) => {
    const v = getValues();
    const keep = (cur: string, next?: string) => (cur.trim() ? cur : (next ?? ''));
    form.reset({
      ...v,
      basics: {
        ...v.basics,
        officeName: keep(v.basics.officeName, d.basics?.officeName),
        officeNameKana: keep(v.basics.officeNameKana, d.basics?.officeNameKana),
        businessSummary: keep(v.basics.businessSummary, d.basics?.businessSummary),
        address: keep(v.basics.address, d.basics?.address),
        serviceAreaText: keep(v.basics.serviceAreaText, d.basics?.serviceAreaText),
        phone: keep(v.basics.phone, d.basics?.phone),
        businessHours: keep(v.basics.businessHours, d.basics?.businessHours),
        closedDays: keep(v.basics.closedDays, d.basics?.closedDays),
        foundedYear: keep(v.basics.foundedYear, d.basics?.foundedYear),
        representativeName: keep(
          v.basics.representativeName,
          d.basics?.representativeName,
        ),
        existingSiteUrl: keep(v.basics.existingSiteUrl, d.basics?.existingSiteUrl),
      },
      strengths: {
        ...v.strengths,
        strengths: [
          keep(v.strengths.strengths[0], d.strengths?.strengths?.[0]),
          keep(v.strengths.strengths[1], d.strengths?.strengths?.[1]),
          keep(v.strengths.strengths[2], d.strengths?.strengths?.[2]),
        ] as [string, string, string],
        differentiator: keep(v.strengths.differentiator, d.strengths?.differentiator),
        foundingStory: keep(v.strengths.foundingStory, d.strengths?.foundingStory),
        achievements: keep(v.strengths.achievements, d.strengths?.achievements),
        certifications: keep(v.strengths.certifications, d.strengths?.certifications),
      },
      target: {
        customerProfile: keep(v.target.customerProfile, d.target?.customerProfile),
        customerNeeds: keep(v.target.customerNeeds, d.target?.customerNeeds),
        searchKeywordsText: keep(
          v.target.searchKeywordsText,
          d.target?.searchKeywords?.join('\n'),
        ),
      },
      cta: { ...v.cta, primaryAction: keep(v.cta.primaryAction, d.cta?.primaryAction) },
      mood: {
        ...v.mood,
        tone: keep(v.mood.tone, d.mood?.tone),
        // 既定色のままなら提案色を採用（オペレーターが選んだ色は守る）
        mainColor:
          v.mood.mainColor && v.mood.mainColor !== '#1e3a5f'
            ? v.mood.mainColor
            : (d.mood?.mainColor ?? v.mood.mainColor),
      },
      aeo: {
        ...v.aeo,
        serviceAreaCitiesText: keep(
          v.aeo.serviceAreaCitiesText,
          d.aeo?.serviceAreaCities?.join('\n'),
        ),
        positioningStatement: keep(
          v.aeo.positioningStatement,
          d.aeo?.positioningStatement,
        ),
        competitor1: keep(v.aeo.competitor1, d.aeo?.competitors?.[0]),
        competitor2: keep(v.aeo.competitor2, d.aeo?.competitors?.[1]),
      },
      operation: {
        ...v.operation,
        desiredLaunchDate: keep(
          v.operation.desiredLaunchDate,
          d.operation?.desiredLaunchDate,
        ),
        updateFrequency: keep(v.operation.updateFrequency, d.operation?.updateFrequency),
        updateOwner: keep(v.operation.updateOwner, d.operation?.updateOwner),
      },
    });
  };

  const onDraftFromMemo = () => {
    startTransition(async () => {
      setTopError(null);
      setNotice(null);
      const result = await draftStep1FromMemo(memoText);
      if (!result.ok) {
        setTopError(result.error);
        return;
      }
      applyDraft(result.draft);
      setNotice(
        'メモから下書きを作成しました。各項目を確認・修正してから確定してください（★印の項目は特に確認を）',
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setTopError(null);
      const result = await submitStep1(projectId, toInput(values));
      // 成功時はサーバー側でredirectされるため、ここに戻るのは失敗時のみ
      if (result && !result.ok) {
        setTopError(result.error);
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          const mapped =
            ERROR_PATH_MAP[path] ??
            (path.replace(/\.(\d+)$/, '.$1') as Path<FormValues>);
          setError(mapped, { type: 'server', message });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  const inputCls =
    'mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100';

  const Field = ({
    label,
    required,
    fuel,
    path,
    hint,
    children,
  }: {
    label: string;
    required?: boolean;
    /** 出力品質を決める必須燃料（★3項目） */
    fuel?: boolean;
    path?: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-1 text-red-500">必須</span>}
        {fuel && (
          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            ★ 仕上がりを決める項目
          </span>
        )}
      </label>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      {children}
      {path && err(path) && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {err(path)}
        </p>
      )}
    </div>
  );

  const Section = ({
    code,
    title,
    children,
  }: {
    code: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h3 className="text-sm font-bold text-neutral-900">
        <span className="mr-2 text-neutral-400">{code}</span>
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {(topError || notice) && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            topError
              ? 'bg-red-50 text-red-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {topError ?? notice}
        </div>
      )}

      {!readOnly && (
        <section className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6">
          <h3 className="text-sm font-bold text-neutral-900">
            打ち合わせメモから自動入力
            <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
              AI
            </span>
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            議事録やメモをそのまま貼り付けると、AIが下の項目に下書きを入れます（入力済みの欄は上書きしません）。手入力で埋めても構いません。
          </p>
          <textarea
            rows={5}
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            disabled={pending}
            placeholder={
              '例:\n山田さん（山田製作所・金属加工）と打ち合わせ。堺市の町工場、従業員8名。試作の速さが売りで…'
            }
            className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onDraftFromMemo}
              disabled={pending || memoText.trim().length < 30}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {pending ? 'AIが下書きを作成中…（10〜20秒）' : 'AIで下書きを作成'}
            </button>
          </div>
        </section>
      )}

      <fieldset disabled={readOnly || pending} className="space-y-6">
        <Section code="A" title="事業の基本情報">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="事業者名（会社名・店舗名・事務所名）" required path="basics.officeName">
              <input className={inputCls} {...register('basics.officeName')} />
            </Field>
            <Field label="ふりがな" required path="basics.officeNameKana">
              <input className={inputCls} {...register('basics.officeNameKana')} />
            </Field>
          </div>
          {/* 業種はここでは選ばせない: 確定時にAIが業務内容から判定し、Step2で確認できる */}
          <Field
            label="業務内容の一言説明"
            required
            path="basics.businessSummary"
            hint="例: 中小企業の税務顧問と相続税申告が専門の税理士事務所（業種はこの内容からAIが自動判定します）"
          >
            <input className={inputCls} {...register('basics.businessSummary')} />
          </Field>
          <Field label="所在地" required path="basics.address">
            <input className={inputCls} {...register('basics.address')} />
          </Field>
          <Field
            label="商圏"
            required
            path="basics.serviceAreaText"
            hint="例: 大阪市内・北摂エリア"
          >
            <input className={inputCls} {...register('basics.serviceAreaText')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="電話番号" required path="basics.phone">
              <input className={inputCls} {...register('basics.phone')} />
            </Field>
            <Field label="営業時間" required path="basics.businessHours">
              <input
                className={inputCls}
                placeholder="平日 9:00〜18:00"
                {...register('basics.businessHours')}
              />
            </Field>
            <Field label="定休日" required path="basics.closedDays">
              <input
                className={inputCls}
                placeholder="土日祝"
                {...register('basics.closedDays')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="開業年（任意）" path="basics.foundedYear">
              <input className={inputCls} {...register('basics.foundedYear')} />
            </Field>
            <Field label="代表者名（任意）" path="basics.representativeName">
              <input
                className={inputCls}
                {...register('basics.representativeName')}
              />
            </Field>
            <Field label="既存サイトURL（任意）" path="basics.existingSiteUrl">
              <input
                className={inputCls}
                placeholder="https://"
                {...register('basics.existingSiteUrl')}
              />
            </Field>
          </div>
        </Section>

        <Section code="B" title="強み">
          {([0, 1, 2] as const).map((i) => (
            <Field
              key={i}
              label={`強み ${i + 1}`}
              required
              path={`strengths.strengths.${i}`}
            >
              <input
                className={inputCls}
                {...register(`strengths.strengths.${i}` as const)}
              />
            </Field>
          ))}
          <Field label="同業他社との違い" required path="strengths.differentiator">
            <textarea
              rows={3}
              className={inputCls}
              {...register('strengths.differentiator')}
            />
          </Field>
          <Field label="創業ストーリー（任意）" path="strengths.foundingStory">
            <textarea
              rows={3}
              className={inputCls}
              {...register('strengths.foundingStory')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="実績数字（任意）" path="strengths.achievements">
              <input
                className={inputCls}
                placeholder="例: 相続税申告 累計200件"
                {...register('strengths.achievements')}
              />
            </Field>
            <Field label="資格・受賞（任意）" path="strengths.certifications">
              <input className={inputCls} {...register('strengths.certifications')} />
            </Field>
          </div>
        </Section>

        <Section code="C" title="ターゲット">
          <Field label="想定する客層・地域" required path="target.customerProfile">
            <input className={inputCls} {...register('target.customerProfile')} />
          </Field>
          <Field label="顧客の悩み・求めるもの" required path="target.customerNeeds">
            <textarea
              rows={3}
              className={inputCls}
              {...register('target.customerNeeds')}
            />
          </Field>
          <Field
            label="お客様が検索しそうな言葉"
            required
            fuel
            path="target.searchKeywordsText"
            hint="1行に1つ（例: 大阪 相続税 税理士）。この言葉がサイトの文章に織り込まれます"
          >
            <textarea
              rows={4}
              className={inputCls}
              {...register('target.searchKeywordsText')}
            />
          </Field>
        </Section>

        <Section code="D" title="ゴール（一番してほしい行動）">
          <Field label="CTA" required path="cta.primaryAction">
            <select className={inputCls} {...register('cta.primaryAction')}>
              <option value="">選択してください</option>
              {Object.entries(CTA_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="予約ツールURL（任意）" path="cta.bookingToolUrl">
            <input
              className={inputCls}
              placeholder="https://"
              {...register('cta.bookingToolUrl')}
            />
          </Field>
        </Section>

        <Section code="E" title="必要ページ">
          <Field
            label="ページ構成"
            required
            path="pages.pageKeys"
            hint="士業サイトの標準構成が選択済みです。不要なものだけ外してください"
          >
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DEFAULT_PAGE_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={key}
                    {...register('pages.pageKeys')}
                  />
                  {PAGE_LABELS[key]}
                </label>
              ))}
            </div>
          </Field>
        </Section>

        <Section code="F" title="サイトの雰囲気">
          <Field label="トーン" required path="mood.tone">
            <select className={inputCls} {...register('mood.tone')}>
              <option value="">選択してください</option>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="メインカラー" required path="mood.mainColor">
            <input
              type="color"
              className="mt-1 h-10 w-20 cursor-pointer rounded border border-neutral-300"
              {...register('mood.mainColor')}
            />
          </Field>
          <Field
            label="参考サイトURL"
            required
            fuel
            path="mood.referenceUrl1"
            hint="「こんな雰囲気にしたい」サイトを1〜2件"
          >
            <input
              className={inputCls}
              placeholder="https://"
              {...register('mood.referenceUrl1')}
            />
            <input
              className={`${inputCls} mt-2`}
              placeholder="https://（2件目・任意）"
              {...register('mood.referenceUrl2')}
            />
          </Field>
        </Section>

        <Section code="G" title="素材">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ロゴ" required path="assets.hasLogo">
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('assets.hasLogo')} />
                ロゴデータがある
              </label>
            </Field>
            <Field
              label="写真の点数"
              required
              path="assets.photoCount"
              hint="0でも公開できます（写真なしのデザインに自動調整）"
            >
              <input
                type="number"
                min={0}
                max={50}
                className={inputCls}
                {...register('assets.photoCount', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="既存パンフレット等（任意）" path="assets.pamphletNote">
            <input
              className={inputCls}
              placeholder="例: 会社案内PDFあり"
              {...register('assets.pamphletNote')}
            />
          </Field>
        </Section>

        <Section code="H" title="AIに見つけてもらう設定（AEO/GEO）">
          <Field
            label="商圏エリア（市区町村）"
            required
            path="aeo.serviceAreaCitiesText"
            hint="1行に1つ（例: 大阪市北区）"
          >
            <textarea
              rows={3}
              className={inputCls}
              {...register('aeo.serviceAreaCitiesText')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Googleビジネスプロフィール" required path="aeo.hasGbp">
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('aeo.hasGbp')} />
                登録済み
              </label>
            </Field>
            <Field label="GBPのURL（任意）" path="aeo.gbpUrl">
              <input
                className={inputCls}
                placeholder="https://"
                {...register('aeo.gbpUrl')}
              />
            </Field>
          </div>
          <Field
            label="「○○といえば△△」ポジショニング一文"
            required
            fuel
            path="aeo.positioningStatement"
            hint="例: 北摂の飲食店の税務といえば山田税理士事務所"
          >
            <input
              className={inputCls}
              {...register('aeo.positioningStatement')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="競合1（任意）" path="aeo.competitor1">
              <input className={inputCls} {...register('aeo.competitor1')} />
            </Field>
            <Field label="競合2（任意）" path="aeo.competitor2">
              <input className={inputCls} {...register('aeo.competitor2')} />
            </Field>
          </div>
        </Section>

        <Section code="I" title="運用">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ドメイン" required path="operation.domainType">
              <select className={inputCls} {...register('operation.domainType')}>
                <option value="">選択してください</option>
                <option value="new">新規取得</option>
                <option value="existing">既存ドメインを使う</option>
              </select>
            </Field>
            <Field label="ドメイン名（任意）" path="operation.domainName">
              <input
                className={inputCls}
                placeholder="example.jp"
                {...register('operation.domainName')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="公開希望時期" required path="operation.desiredLaunchDate">
              <input
                className={inputCls}
                placeholder="例: 8月末まで"
                {...register('operation.desiredLaunchDate')}
              />
            </Field>
            <Field
              label="承認者メールアドレス"
              required
              path="operation.approverEmail"
              hint="公開前レビューの承認者"
            >
              <input
                className={inputCls}
                type="email"
                {...register('operation.approverEmail')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="更新頻度（任意）" path="operation.updateFrequency">
              <input className={inputCls} {...register('operation.updateFrequency')} />
            </Field>
            <Field label="更新担当（任意）" path="operation.updateOwner">
              <input className={inputCls} {...register('operation.updateOwner')} />
            </Field>
          </div>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/95 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={pending}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            下書き保存
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {pending ? '保存中…' : '確定して次へ（テンプレ選択）'}
          </button>
        </div>
      )}
    </form>
  );
}
