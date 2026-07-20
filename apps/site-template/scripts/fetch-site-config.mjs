/**
 * CI用: Supabaseから対象projectのSiteConfigを取得して site.config.json に書き出す。
 * 使い方: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fetch-site-config.mjs <project_id> <out_path>
 *
 * SiteConfig組み立てはstudio側（タスク#5で実装するbuildSiteConfig）がpagesとprojectsから
 * 事前に組み立てて projects.site_config に保存したものを読む方式ではなく、
 * ここでは projects と pages から直接構築する。ロジックは1箇所（@sokko/shared）に置く。
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const [projectId, outPath = 'site.config.json'] = process.argv.slice(2);
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!projectId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fetch-site-config.mjs <project_id> [out_path]',
  );
  process.exit(1);
}

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const [project] = await rest(
  `projects?id=eq.${projectId}&select=id,name,slug,input,site_config,custom_domain`,
);
if (!project) {
  console.error(`project ${projectId} not found`);
  process.exit(1);
}
if (!project.site_config || Object.keys(project.site_config).length === 0) {
  console.error(
    `project ${projectId} has no site_config yet (generation not finished?)`,
  );
  process.exit(1);
}

// 画像アセットをビルドに同梱し、同一オリジン配信にする
// （Supabaseへのクロスオリジン取得はDNS/TLS往復が乗りLCPを数秒悪化させる。
//   同梱により画像配信がSupabase障害の影響も受けなくなる）
const config = project.site_config;
async function localize(url, name) {
  if (!url) return url;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`media fetch failed (${res.status}), keeping remote URL: ${url}`);
    return url;
  }
  const ext = (url.split('.').pop() ?? 'bin').split('?')[0];
  mkdirSync('public/media', { recursive: true });
  writeFileSync(`public/media/${name}.${ext}`, Buffer.from(await res.arrayBuffer()));
  return `/media/${name}.${ext}`;
}
if (config.images) {
  for (const slot of ['hero', 'representative', 'office']) {
    config.images[slot] = await localize(config.images[slot], slot);
  }
}
if (config.design?.logoPath) {
  config.design.logoPath = await localize(config.design.logoPath, 'logo');
}

writeFileSync(outPath, JSON.stringify(config, null, 2));
// ワークフローが読むメタ情報（独自ドメイン等）
writeFileSync(
  'deploy-meta.json',
  JSON.stringify({ customDomain: project.custom_domain ?? null }),
);
console.log(`SiteConfig written to ${outPath} (project: ${project.name})`);
