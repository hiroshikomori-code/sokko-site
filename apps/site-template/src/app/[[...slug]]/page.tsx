import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageRenderer, SiteShell } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';
import { LiveNews, LiveNewsDigest } from '@/components/live-news';

const config = loadSiteConfig();

function pathFromSlug(slug?: string[]): string {
  return slug && slug.length > 0 ? `/${slug.join('/')}` : '/';
}

export function generateStaticParams() {
  return config.pages.map((p) => ({
    slug: p.path === '/' ? [] : p.path.replace(/^\//, '').split('/'),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = config.pages.find((p) => p.path === pathFromSlug(slug));
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${config.meta.baseUrl}${page.path}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${config.meta.baseUrl}${page.path}`,
      siteName: config.meta.siteName,
      locale: 'ja_JP',
      type: 'website',
    },
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const path = pathFromSlug(slug);
  const page = config.pages.find((p) => p.path === path);
  if (!page) notFound();

  return (
    <SiteShell config={config} currentPath={path}>
      <PageRenderer
        page={page}
        config={config}
        overrides={{ news: LiveNews, news_digest: LiveNewsDigest }}
      />
    </SiteShell>
  );
}
