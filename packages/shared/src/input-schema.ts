import { z } from 'zod';
import {
  CTA_TYPES,
  DEFAULT_PAGE_KEYS,
  INDUSTRY_TYPES,
  TONES,
} from './constants';

const requiredText = (label: string, max = 200) =>
  z
    .string({ required_error: `${label}は必須です` })
    .trim()
    .min(1, `${label}は必須です`)
    .max(max, `${label}は${max}文字以内で入力してください`);

const optionalText = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

const urlField = z
  .string()
  .trim()
  .url('URLの形式が正しくありません（https://〜）');

/** A. 事業基本（§10-A） */
export const basicsSchema = z.object({
  officeName: requiredText('事務所名', 100),
  officeNameKana: requiredText('ふりがな', 100),
  // 業種プリセット: オペレーター入力ではなくStep1確定時にAIが判定して埋める
  // （判定失敗・旧データはgeneric扱い。Step2で確認・修正できる）
  industryType: z
    .enum(
      Object.keys(INDUSTRY_TYPES) as [
        keyof typeof INDUSTRY_TYPES,
        ...(keyof typeof INDUSTRY_TYPES)[],
      ],
    )
    .default('generic'),
  /** 肩書き等に使う自然な業種ラベル（AI判定。例:「学習塾」「工務店」）。無ければプリセット名 */
  industryLabel: z.string().max(40).optional(),
  businessSummary: requiredText('業務内容の一言説明', 200),
  address: requiredText('所在地', 200),
  serviceAreaText: requiredText('商圏（例: 大阪市内・北摂エリア）', 200),
  phone: requiredText('電話番号', 20),
  businessHours: requiredText('営業時間', 100),
  closedDays: requiredText('定休日', 100),
  foundedYear: optionalText(10),
  representativeName: optionalText(50),
  existingSiteUrl: urlField.optional().or(z.literal('').transform(() => undefined)),
  snsUrls: z.array(urlField).max(5).default([]),
});

/** B. 強み（§10-B） */
export const strengthsSchema = z.object({
  strengths: z
    .array(z.string().trim().min(1, '強みを入力してください').max(200))
    .length(3, '強みは3つ入力してください'),
  differentiator: requiredText('他事務所との違い', 500),
  foundingStory: optionalText(1000),
  achievements: optionalText(500),
  certifications: optionalText(500),
});

/** C. ターゲット（§10-C）— searchKeywords は必須燃料 */
export const targetSchema = z.object({
  customerProfile: requiredText('想定する客層・地域', 300),
  customerNeeds: requiredText('顧客の悩み・求めるもの', 500),
  searchKeywords: z
    .array(z.string().trim().min(1).max(50))
    .min(1, '検索しそうな言葉を1つ以上入力してください（出力品質を決める燃料です）')
    .max(10),
});

/** D. ゴール/CTA（§10-D） */
export const ctaSchema = z.object({
  primaryAction: z.enum(
    Object.keys(CTA_TYPES) as [keyof typeof CTA_TYPES, ...(keyof typeof CTA_TYPES)[]],
    { errorMap: () => ({ message: '一番してほしい行動を選択してください' }) },
  ),
  bookingToolUrl: urlField.optional().or(z.literal('').transform(() => undefined)),
});

/** E. 必要ページ（§10-E）— 士業デフォルト構成から足し引き */
export const pagesSchema = z.object({
  pageKeys: z
    .array(z.enum(DEFAULT_PAGE_KEYS))
    .min(3, 'ページは3つ以上選択してください')
    .default([...DEFAULT_PAGE_KEYS]),
});

/** F. 雰囲気（§10-F）— referenceUrls は必須燃料 */
export const moodSchema = z.object({
  tone: z.enum(TONES, {
    errorMap: () => ({ message: 'トーンを選択してください' }),
  }),
  mainColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'メインカラーを選択してください'),
  referenceUrls: z
    .array(urlField)
    .min(1, '参考サイトURLを1つ以上入力してください（出力品質を決める燃料です）')
    .max(2),
});

/** G. 素材（§10-G） */
export const assetsSchema = z.object({
  hasLogo: z.boolean(),
  photoCount: z.number().int().min(0).max(50),
  pamphletNote: optionalText(500),
});

/** H. AEO/GEO（§10-H・堀）— positioningStatement は必須燃料 */
export const aeoSchema = z.object({
  serviceAreaCities: z
    .array(z.string().trim().min(1).max(50))
    .min(1, '商圏エリア（市区町村）を1つ以上入力してください'),
  hasGbp: z.boolean(),
  gbpUrl: urlField.optional().or(z.literal('').transform(() => undefined)),
  positioningStatement: requiredText(
    '「○○といえば△△」ポジショニング一文（出力品質を決める燃料です）',
    200,
  ),
  competitors: z.array(z.string().trim().max(100)).max(2).default([]),
});

/** I. 運用（§10-I） */
export const operationSchema = z.object({
  domainType: z.enum(['existing', 'new'], {
    errorMap: () => ({ message: 'ドメインの種別を選択してください' }),
  }),
  domainName: optionalText(100),
  desiredLaunchDate: requiredText('公開希望時期', 50),
  approverEmail: z
    .string({ required_error: '承認者は必須です' })
    .trim()
    .email('承認者のメールアドレスの形式が正しくありません'),
  updateFrequency: optionalText(100),
  updateOwner: optionalText(100),
});

/** ①入力の全体（projects.input に保存されるJSONの形） */
export const projectInputSchema = z.object({
  basics: basicsSchema,
  strengths: strengthsSchema,
  target: targetSchema,
  cta: ctaSchema,
  pages: pagesSchema,
  mood: moodSchema,
  assets: assetsSchema,
  aeo: aeoSchema,
  operation: operationSchema,
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

/** 下書き保存用（セクション単位で部分的に埋まっている状態を許容） */
export const projectInputDraftSchema = projectInputSchema.deepPartial();
export type ProjectInputDraft = z.infer<typeof projectInputDraftSchema>;
