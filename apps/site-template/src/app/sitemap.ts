import type { MetadataRoute } from 'next';
import { loadSiteConfig } from '@/lib/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const config = loadSiteConfig();
  return config.pages.map((p) => ({
    url: `${config.meta.baseUrl}${p.path}`,
    changeFrequency: p.key === 'news' ? 'weekly' : 'monthly',
    priority: p.path === '/' ? 1 : 0.7,
  }));
}
