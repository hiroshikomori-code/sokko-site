/** 士業種別（MVP対象の3業種） */
export const INDUSTRY_TYPES = {
  tax: '税理士',
  labor: '社会保険労務士',
  gyosei: '行政書士',
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
