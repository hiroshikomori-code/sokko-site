import { buildLlmsTxt } from '@sokko/site-kit';
import { loadSiteConfig } from '@/lib/config';

// GEO: AI回答エンジン向けサイト要約（§12）。静的エクスポートに含める
export const dynamic = 'force-static';

export function GET() {
  const body = buildLlmsTxt(loadSiteConfig());
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
