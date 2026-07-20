import { z } from 'zod';
import { DEFAULT_PAGE_KEYS, DESIGN_VARIANT_KEYS, TONES } from './constants';

/**
 * SiteConfig ─ studio が書き、site-template が読み、CI が運ぶ三者契約。
 * 生成サイトはこのJSONだけを入力として静的ビルドされる（fetch等の外部依存なし。
 * 唯一の例外はお知らせ欄のクライアントサイドフェッチで、その接続情報も本契約に含む）。
 */

/** ページを構成するセクション（テンプレのコンポーネントと1:1対応） */
export const sectionSchema = z.object({
  /** site-kit のセクションコンポーネント種別 */
  type: z.enum([
    'hero',
    'services',
    'pricing',
    'profile',
    'testimonials',
    'access',
    'contact',
    'faq',
    'news',
    /** トップ用: 最新お知らせ3件＋一覧導線（buildSiteConfigが自動挿入。AIは生成しない） */
    'news_digest',
    'richtext',
    'cta',
  ]),
  heading: z.string().optional(),
  body: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().optional(),
        /** 価格・日付・資格名など項目の補足 */
        meta: z.string().optional(),
        /** Supabase Storage 上の画像パス（ビジュアル配置ステップで割当） */
        imagePath: z.string().optional(),
      }),
    )
    .optional(),
});
export type Section = z.infer<typeof sectionSchema>;

export const sitePageSchema = z.object({
  key: z.enum(DEFAULT_PAGE_KEYS),
  path: z.string(),
  title: z.string(),
  description: z.string(),
  /** ナビ表記（業種プリセット由来。無ければ NAV_LABELS の既定を使う） */
  navLabel: z.string().optional(),
  sections: z.array(sectionSchema),
});
export type SitePage = z.infer<typeof sitePageSchema>;

/** 画像の参照先: 絶対URL または ルート相対パス（CIのビルド同梱後は /media/...） */
const imagePathSchema = z
  .string()
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
    message: '画像は絶対URLまたは/始まりの相対パスで指定してください',
  });

export const siteConfigSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    siteName: z.string(),
    locale: z.literal('ja'),
    /** 本番URL（OGP・canonical・sitemap生成に使用） */
    baseUrl: z.string().url(),
  }),
  business: z.object({
    officeName: z.string(),
    officeNameKana: z.string(),
    industryLabel: z.string(),
    /** JSON-LDの@type（業種プリセット由来。過去configはdefaultでLegalService） */
    schemaType: z.string().default('LegalService'),
    /** JSON-LD @type: LegalService 等のエンティティ記述に使用 */
    description: z.string(),
    address: z.string(),
    phone: z.string(),
    businessHours: z.string(),
    closedDays: z.string(),
    serviceAreaCities: z.array(z.string()),
    representativeName: z.string().optional(),
    certifications: z.string().optional(),
    foundedYear: z.string().optional(),
    gbpUrl: z.string().optional(),
  }),
  design: z.object({
    templateId: z.string(),
    tone: z.enum(TONES),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    logoPath: z.string().optional(),
    /** デザインバリアント（Step2で選択）。過去のsite_configはdefaultでclassic扱い */
    variant: z.enum(DESIGN_VARIANT_KEYS).default('classic'),
  }),
  /**
   * 画像スロット。未設定スロットは写真なしデザインに自動フォールバック。
   * 絶対URL（studioプレビュー時）と /media/ 相対パス（CIがビルド同梱に書き換えた後）の両方を許容
   */
  images: z
    .object({
      hero: imagePathSchema.optional(),
      /** ヒーローのモバイル用縮小版（srcset用。無ければheroのみで配信） */
      heroSm: imagePathSchema.optional(),
      representative: imagePathSchema.optional(),
      office: imagePathSchema.optional(),
    })
    .optional(),
  cta: z.object({
    primaryAction: z.string(),
    label: z.string(),
    phone: z.string().optional(),
    bookingToolUrl: z.string().optional(),
  }),
  aeo: z.object({
    positioningStatement: z.string(),
    searchKeywords: z.array(z.string()),
    /** llms.txt にそのまま出力するAIクローラ向けサイト要約 */
    llmsSummary: z.string(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  }),
  pages: z.array(sitePageSchema),
  announcements: z.object({
    /** 公開ビルド時に焼き込む時点スナップショット（フォールバック兼AEO用） */
    baked: z.array(
      z.object({
        id: z.string(),
        body: z.string(),
        publishedAt: z.string(),
      }),
    ),
    /** クライアントサイドで最新分を上書き取得するための接続情報（anonキーは公開前提） */
    supabaseUrl: z.string().url(),
    supabaseAnonKey: z.string(),
    projectId: z.string().uuid(),
  }),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;
