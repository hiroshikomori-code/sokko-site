import { z } from 'zod';
import { sectionSchema } from './site-config';
import type { PageKey } from './constants';

/** 生成ジョブが pages.content に保存するJSONの形（ページ単位の生成契約） */
export const pageContentSchema = z.object({
  /** SEOタイトル（例: サービス名｜事務所名） */
  title: z.string(),
  /** メタディスクリプション（AEO: 検索語を自然に織り込む） */
  description: z.string(),
  sections: z.array(sectionSchema),
});
export type PageContent = z.infer<typeof pageContentSchema>;

/** サイト全体メタ（page_key='_meta' のジョブが生成する） */
export const siteMetaContentSchema = z.object({
  /** llms.txt に出力するAIクローラ向けサイト要約（2〜3文） */
  llmsSummary: z.string(),
  /** FAQ（AEO: FAQPage構造化データ＋トップページに表示） */
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .min(3)
    .max(6),
});
export type SiteMetaContent = z.infer<typeof siteMetaContentSchema>;

/** AI生成の対象となる特殊ページキー（サイト全体メタ） */
export const META_PAGE_KEY = '_meta' as const;

/**
 * ページ設計図: ページごとに使うセクション構成を固定する
 * （再現性＞自由度: AIは文章を作り、構造はテンプレが決める）。
 * news はお知らせ一覧の器なのでAI生成対象外（コードで固定生成）。
 */
export const PAGE_BLUEPRINTS: Record<
  Exclude<PageKey, 'news'>,
  { purpose: string; sections: string[] }
> = {
  home: {
    purpose:
      'トップページ。第一印象で「何者で・どこで・何をするか」を明快に伝え、相談への一歩を促す。',
    sections: ['hero', 'services', 'faq', 'cta'],
  },
  services: {
    purpose: '取扱業務の詳細。誰のどんな悩みをどう解決するかを具体的に。',
    sections: ['services', 'cta'],
  },
  pricing: {
    purpose:
      '料金の目安。不安を取り除く誠実な価格提示。金額はダミーではなく入力情報から妥当な目安を提示し、「※内容により変動」を必ず添える。',
    sections: ['pricing', 'cta'],
  },
  about: {
    purpose:
      '代表・事務所紹介。E-E-A-T（経験・専門性・権威性・信頼性）を担う最重要ページ。資格・経歴・人柄。',
    sections: ['profile', 'richtext'],
  },
  cases: {
    purpose:
      'お客様の声・解決事例。実在を装った捏造は禁止。入力の実績・強みから「よくある相談例と対応方針」として構成してもよい。',
    sections: ['testimonials'],
  },
  access: {
    purpose: 'アクセス。所在地・営業時間に加え、来訪者目線の道案内文。',
    sections: ['access'],
  },
  contact: {
    purpose: 'お問い合わせ・相談予約。心理的ハードルを下げる一言と明快な導線。',
    sections: ['contact'],
  },
};
