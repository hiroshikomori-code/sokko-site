import type { Section, SitePage, SiteConfig } from '@sokko/shared';
import {
  Access,
  Contact,
  Cta,
  Faq,
  Hero,
  News,
  NewsDigest,
  Pricing,
  Profile,
  RichText,
  Services,
  Testimonials,
} from './sections';

const SECTION_COMPONENTS: Record<
  Section['type'],
  (props: { section: Section; config: SiteConfig }) => React.ReactNode
> = {
  hero: Hero,
  services: Services,
  pricing: Pricing,
  profile: Profile,
  testimonials: Testimonials,
  access: Access,
  contact: Contact,
  faq: Faq,
  news: News,
  news_digest: NewsDigest,
  richtext: RichText,
  cta: Cta,
};

type SectionComponent = (props: {
  section: Section;
  config: SiteConfig;
}) => React.ReactNode;

/**
 * SitePage の sections を順にレンダリングする（SiteConfig契約の実行部）。
 * overrides でセクション種別ごとに差し替え可能
 * （site-template が news をライブ取得版に差し替えるために使う）。
 */
export function PageRenderer({
  page,
  config,
  overrides,
}: {
  page: SitePage;
  config: SiteConfig;
  overrides?: Partial<Record<Section['type'], SectionComponent>>;
}) {
  return (
    <>
      {page.sections.map((section, i) => {
        const Component =
          overrides?.[section.type] ?? SECTION_COMPONENTS[section.type];
        return <Component key={`${section.type}-${i}`} section={section} config={config} />;
      })}
    </>
  );
}
