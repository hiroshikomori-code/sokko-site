/**
 * 業種プリセットキー。オペレーターは選択せず、Step1確定時にAIが
 * 業務内容から自動判定する（Step2で確認・修正可能）。
 * どのプリセットにも該当しない業種は generic（汎用）に落ちる
 */
export const INDUSTRY_TYPES = {
  tax: '税理士',
  labor: '社会保険労務士',
  gyosei: '行政書士',
  it: 'IT・システム開発',
  generic: 'その他の事業者',
} as const;
export type IndustryType = keyof typeof INDUSTRY_TYPES;

/** プロジェクトの状態遷移（§15）。revising は差し戻し中（計画3.1章） */
export const PROJECT_STATUSES = [
  'draft',
  'generating',
  'revising',
  'review',
  'published',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** 士業テンプレの標準ページ構成（仕様書§13） */
export const DEFAULT_PAGE_KEYS = [
  'home',
  'services',
  'pricing',
  'about',
  'cases',
  'access',
  'contact',
  'news',
] as const;
export type PageKey = (typeof DEFAULT_PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  home: 'トップ',
  services: 'サービス（取扱業務）',
  pricing: '料金の目安',
  about: '代表・事務所紹介',
  cases: 'お客様の声・解決事例',
  access: 'アクセス',
  contact: 'お問い合わせ・相談予約',
  news: 'お知らせ',
};

/** グローバルナビ用の短い表記（PAGE_LABELSは管理画面用の正式名） */
export const NAV_LABELS: Record<PageKey, string> = {
  home: 'ホーム',
  services: 'サービス',
  pricing: '料金',
  about: '事務所紹介',
  cases: 'お客様の声',
  access: 'アクセス',
  contact: 'お問い合わせ',
  news: 'お知らせ',
};

/**
 * 業種プリセット（ユーザビリティテスト2026-07-20の宿題①）。
 * 業種ごとの言葉づかい・構造化データ種別をデータで持ち、
 * 新業種はここへの追記だけで対応できるようにする。
 * ラベル未指定のページは PAGE_LABELS / NAV_LABELS の既定（士業標準）を使う。
 */
export const INDUSTRY_PRESETS: Record<
  IndustryType,
  {
    /** 生成プロンプトで使う業種の説明（「◯◯専門のコピーライター」等） */
    writerRole: string;
    /** JSON-LDの@type（LocalBusiness系のサブタイプ） */
    schemaType: string;
    pageLabels?: Partial<Record<PageKey, string>>;
    navLabels?: Partial<Record<PageKey, string>>;
  }
> = {
  tax: { writerRole: '士業（税理士）', schemaType: 'AccountingService' },
  labor: { writerRole: '士業（社会保険労務士）', schemaType: 'LegalService' },
  gyosei: { writerRole: '士業（行政書士）', schemaType: 'LegalService' },
  it: {
    writerRole: 'IT企業（システム開発・DX支援）',
    schemaType: 'ProfessionalService',
    pageLabels: {
      services: 'サービス',
      pricing: '料金プラン',
      about: '会社概要・代表紹介',
      cases: '導入事例',
      contact: 'お問い合わせ・無料相談',
    },
    navLabels: {
      about: '会社概要',
      cases: '導入事例',
    },
  },
  // 汎用（プリセット未整備の業種の受け皿。ラベルは業種を特定しない言い回し）
  generic: {
    writerRole: '中小事業者',
    schemaType: 'LocalBusiness',
    pageLabels: {
      services: 'サービス・事業内容',
      about: '私たちについて',
      cases: 'お客様の声・事例',
    },
    navLabels: {
      services: 'サービス',
      about: '私たちについて',
      cases: 'お客様の声',
    },
  },
};

/** 業種を考慮したページ正式名／ナビ表記 */
export function pageLabelFor(industry: IndustryType, key: PageKey): string {
  return INDUSTRY_PRESETS[industry].pageLabels?.[key] ?? PAGE_LABELS[key];
}
export function navLabelFor(industry: IndustryType, key: PageKey): string {
  return INDUSTRY_PRESETS[industry].navLabels?.[key] ?? NAV_LABELS[key];
}

export const PAGE_PATHS: Record<PageKey, string> = {
  home: '/',
  services: '/services',
  pricing: '/pricing',
  about: '/about',
  cases: '/cases',
  access: '/access',
  contact: '/contact',
  news: '/news',
};

/** トーン選択肢（§10-F） */
export const TONES = ['信頼', '親しみ', '高級', '誠実'] as const;
export type Tone = (typeof TONES)[number];

/** デザインバリアント（Step2で選択。§9-2）。見た目のみの切替で構造・文章は共通 */
export const DESIGN_VARIANTS = {
  classic: {
    label: '上質・信頼',
    description:
      '明朝体の見出し×広い余白×真鍮の装飾ライン。士業・クリニックなど「信頼で選ばれる」業種の王道',
  },
  future: {
    label: '先進・近未来',
    description:
      'ダーク背景×発光アクセント×極太タイポ。IT・テック系や新しさを打ち出したい事業向け',
  },
  warm: {
    label: '温かみ・親しみ',
    description:
      '丸ゴシック×大きな角丸×柔らかな配色。飲食・美容・地域密着サービス向け',
  },
} as const;
export type DesignVariant = keyof typeof DESIGN_VARIANTS;
export const DESIGN_VARIANT_KEYS = ['classic', 'future', 'warm'] as const;

/** CTA種別（§10-D） */
export const CTA_TYPES = {
  consultation: '相談予約',
  phone: '電話',
  contact: 'お問い合わせ',
  document: '資料請求',
} as const;
export type CtaType = keyof typeof CTA_TYPES;

/**
 * 士業広告規制ガード（§13）: 誇大・不当・比較優良表示につながりやすい表現。
 * 生成プロンプト・司令塔批評・公開前機械チェックの三重で使う。
 */
export const PROHIBITED_EXPRESSIONS = [
  '日本一',
  '業界一',
  '地域一',
  'No.1',
  'ナンバーワン',
  '必ず',
  '絶対に',
  '100%',
  '完全に解決',
  '他事務所より優れ',
  '最安',
  '最も安い',
  '誰でも節税',
  '確実に',
] as const;

/** 生成ジョブの状態 */
export const JOB_STATUSES = ['queued', 'running', 'done', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** ①入力スキーマの版数（projects.input_schema_version に保存） */
export const INPUT_SCHEMA_VERSION = 1;
