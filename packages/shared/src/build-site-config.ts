import {
  CTA_TYPES,
  INDUSTRY_TYPES,
  PAGE_LABELS,
  PAGE_PATHS,
  type PageKey,
} from './constants';
import type { ProjectInput } from './input-schema';
import {
  META_PAGE_KEY,
  pageContentSchema,
  siteMetaContentSchema,
} from './page-content';
import { siteConfigSchema, type SiteConfig, type SitePage } from './site-config';

export type PageRow = { page_key: string; content: unknown };

export type BuildSiteConfigOptions = {
  slug: string;
  baseUrl: string;
  projectId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  templateId: string;
  bakedAnnouncements: { id: string; body: string; publishedAt: string }[];
  logoPath?: string;
  /** 画像スロットの公開URL（Step4で割当。未設定は写真なしデザイン） */
  images?: { hero?: string; representative?: string; office?: string };
};

/**
 * ①入力＋生成済みpages → SiteConfig（三者契約の組み立て。ロジックはここ1箇所）。
 * studio がプレビュー・公開時に呼び、結果を projects.site_config に保存する。
 */
export function buildSiteConfig(
  input: ProjectInput,
  pageRows: PageRow[],
  opts: BuildSiteConfigOptions,
): SiteConfig {
  const meta = pageRows.find((p) => p.page_key === META_PAGE_KEY);
  if (!meta) throw new Error('サイト全体メタ（_meta）が未生成です');
  const siteMeta = siteMetaContentSchema.parse(meta.content);

  const pages: SitePage[] = [];
  for (const key of input.pages.pageKeys as PageKey[]) {
    if (key === 'news') {
      pages.push({
        key,
        path: PAGE_PATHS.news,
        title: `お知らせ｜${input.basics.officeName}`,
        description: `${input.basics.officeName}からのお知らせ一覧。`,
        sections: [{ type: 'news', heading: 'お知らせ' }],
      });
      continue;
    }
    const row = pageRows.find((p) => p.page_key === key);
    if (!row) throw new Error(`ページ「${PAGE_LABELS[key]}」が未生成です`);
    const content = pageContentSchema.parse(row.content);
    let sections = content.sections;

    // トップにはお知らせ最新3件＋一覧導線を自動挿入（newsページがある場合のみ）。
    // 構造はテンプレの責務なので、AI生成物には含めずここで決める（再現性＞自由度）
    if (key === 'home' && input.pages.pageKeys.includes('news')) {
      const heroIndex = sections.findIndex((s) => s.type === 'hero');
      sections = [
        ...sections.slice(0, heroIndex + 1),
        { type: 'news_digest', heading: 'お知らせ' },
        ...sections.slice(heroIndex + 1),
      ];
    }

    pages.push({
      key,
      path: PAGE_PATHS[key],
      title: content.title,
      description: content.description,
      sections,
    });
  }

  const config: SiteConfig = {
    version: 1,
    meta: {
      slug: opts.slug,
      siteName: input.basics.officeName,
      locale: 'ja',
      baseUrl: opts.baseUrl,
    },
    business: {
      officeName: input.basics.officeName,
      officeNameKana: input.basics.officeNameKana,
      industryLabel: INDUSTRY_TYPES[input.basics.industryType],
      description: input.basics.businessSummary,
      address: input.basics.address,
      phone: input.basics.phone,
      businessHours: input.basics.businessHours,
      closedDays: input.basics.closedDays,
      serviceAreaCities: input.aeo.serviceAreaCities,
      representativeName: input.basics.representativeName,
      certifications: input.strengths.certifications,
      foundedYear: input.basics.foundedYear,
      gbpUrl: input.aeo.gbpUrl,
    },
    design: {
      templateId: opts.templateId,
      tone: input.mood.tone,
      primaryColor: input.mood.mainColor,
      logoPath: opts.logoPath,
    },
    images: opts.images,
    cta: {
      primaryAction: input.cta.primaryAction,
      label:
        input.cta.primaryAction === 'consultation'
          ? '無料相談を予約する'
          : input.cta.primaryAction === 'phone'
            ? '電話で相談する'
            : input.cta.primaryAction === 'document'
              ? '資料を請求する'
              : `${CTA_TYPES[input.cta.primaryAction]}はこちら`,
      phone: input.basics.phone,
      bookingToolUrl: input.cta.bookingToolUrl,
    },
    aeo: {
      positioningStatement: input.aeo.positioningStatement,
      searchKeywords: input.target.searchKeywords,
      llmsSummary: siteMeta.llmsSummary,
      faq: siteMeta.faq,
    },
    pages,
    announcements: {
      baked: opts.bakedAnnouncements,
      supabaseUrl: opts.supabaseUrl,
      supabaseAnonKey: opts.supabaseAnonKey,
      projectId: opts.projectId,
    },
  };

  // 契約違反はここで即失敗させる（壊れたSiteConfigを下流に流さない）
  return siteConfigSchema.parse(config);
}
