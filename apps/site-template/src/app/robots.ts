import type { MetadataRoute } from 'next';
import { loadSiteConfig } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const config = loadSiteConfig();
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${config.meta.baseUrl}/sitemap.xml`,
  };
}
