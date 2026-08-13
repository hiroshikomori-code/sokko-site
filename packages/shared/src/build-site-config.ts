import {
  CTA_TYPES,
  INDUSTRY_PRESETS,
  INDUSTRY_TYPES,
  navLabelFor,
  pageLabelFor,
  PAGE_LABELS,
  PAGE_PATHS,
  type DesignVariant,
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
  /** 画像スロットの公開URL（ビジュアル配置で割当。未設定は写真なしデザイン） */
  images?: {
    hero?: string;
    heroSm?: string;
    representative?: string;
    office?: string;
    /** 事例・作品ギャラリー（登録順） */
    works?: { src: string; caption?: string }[];
  };
  /** デザインバリアント（projects.design_variant。未指定はclassic） */
  variant?: DesignVariant;
};

/** 案件ごとに安定な擬似乱数（レイアウト分散用。同じ入力なら常に同じ結果=再現性） */
function stableHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * セクションのレイアウト型を決定的ルールで選ぶ（Phase2: デザイン多様化）。
 * 判断材料: 写真の有無・枚数 / デザインバリアント / 項目数 / 案件IDハッシュ。
 * AIやオペレーターの操作は挟まない（壊せない設計・再現性＞自由度）。
 */
function chooseLayout(
  type: string,
  ctx: {
    seed: number;
    variant: DesignVariant;
    hasHero: boolean;
    hasRepresentative: boolean;
    worksCount: number;
    itemCount: number;
  },
): string | undefined {
  const { seed, variant, hasHero, hasRepresentative, worksCount, itemCount } = ctx;
  switch (type) {
    case 'hero':
      // 写真なしはタイポ主役型。futureは全面写真がアイデンティティ。
      // 余白系（minimal/editorial）は左右分割が映える。残りはハッシュで分散
      if (!hasHero) return 'typo';
      if (variant === 'future') return 'photo';
      if (variant === 'minimal' || variant === 'editorial') return 'split';
      return seed % 2 === 0 ? 'photo' : 'split';
    case 'services':
      // 事例写真が3枚以上あれば写真交互のジグザグ型が最も説得力が出る
      if (worksCount >= 3 && itemCount >= 2) return 'zigzag';
      return seed % 2 === 0 ? 'cards' : 'numbered';
    case 'pricing':
      // プランが2〜4件ならカード型が読みやすい（多い場合は表が整理される）
      if (itemCount >= 2 && itemCount <= 4 && seed % 3 !== 0) return 'plans';
      return 'table';
    case 'profile':
      if (hasRepresentative && seed % 3 !== 2) return 'interview';
      return 'standard';
    case 'testimonials':
      return itemCount >= 2 && seed % 2 === 0 ? 'cards' : 'quotes';
    default:
      return undefined;
  }
}

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

  const industry = input.basics.industryType;
  // プリセット外業種（generic）はAI生成の言葉づかいプロファイルを使う
  const profile = industry === 'generic' ? input.basics.industryProfile : undefined;
  const pages: SitePage[] = [];
  for (const key of input.pages.pageKeys as PageKey[]) {
    if (key === 'news') {
      pages.push({
        key,
        path: PAGE_PATHS.news,
        title: `お知らせ｜${input.basics.officeName}`,
        description: `${input.basics.officeName}からのお知らせ一覧。`,
        navLabel: navLabelFor(industry, key, profile),
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

    // 事例・作品の写真がある場合の自動挿入（AIは生成しない=ビルダーの責務）:
    // - トップ: 末尾のCTAの手前にダイジェスト（最大6枚）
    // - 事例ページ(cases): 先頭セクションの直後に全量ギャラリー
    const works = opts.images?.works ?? [];
    if (works.length > 0 && key === 'home') {
      const galleryLabel = pageLabelFor(industry, 'cases', profile);
      const ctaIndex = sections.findIndex((s) => s.type === 'cta');
      const insertAt = ctaIndex === -1 ? sections.length : ctaIndex;
      sections = [
        ...sections.slice(0, insertAt),
        { type: 'works_gallery', heading: galleryLabel },
        ...sections.slice(insertAt),
      ];
    }
    if (works.length > 0 && key === 'cases') {
      sections = [
        ...sections.slice(0, 1),
        { type: 'works_gallery' },
        ...sections.slice(1),
      ];
    }

    // レイアウト型の付与（案件ID＋ページで安定分散）
    sections = sections.map((sec) => ({
      ...sec,
      layout:
        sec.layout ??
        chooseLayout(sec.type, {
          seed: stableHash(`${opts.projectId}:${key}:${sec.type}`),
          variant: opts.variant ?? 'classic',
          hasHero: Boolean(opts.images?.hero),
          hasRepresentative: Boolean(opts.images?.representative),
          worksCount: works.length,
          itemCount: sec.items?.length ?? 0,
        }),
    }));

    pages.push({
      key,
      path: PAGE_PATHS[key],
      title: content.title,
      description: content.description,
      navLabel: navLabelFor(industry, key, profile),
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
      industryLabel:
        input.basics.industryLabel ?? INDUSTRY_TYPES[input.basics.industryType],
      schemaType:
        profile?.schemaType ??
        INDUSTRY_PRESETS[input.basics.industryType].schemaType,
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
      variant: opts.variant ?? 'classic',
    },
    images: opts.images
      ? { ...opts.images, works: opts.images.works ?? [] }
      : undefined,
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
