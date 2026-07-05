import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SAMPLE_SITE_CONFIG,
  siteConfigSchema,
  type SiteConfig,
} from '@sokko/shared';

/**
 * ビルド時にSiteConfigを読み込む（SiteConfig契約の入口）。
 * - SITE_CONFIG_PATH 環境変数（CIがSupabaseから取得したJSONを指す）
 * - 無ければリポジトリ内のサンプル（ローカル開発用）
 */
export function loadSiteConfig(): SiteConfig {
  const configPath = process.env.SITE_CONFIG_PATH;
  if (!configPath) {
    return SAMPLE_SITE_CONFIG;
  }
  const raw = readFileSync(
    configPath.startsWith('/') ? configPath : join(process.cwd(), configPath),
    'utf-8',
  );
  // 不正なJSONはここで即ビルド失敗させる（壊れたサイトを出さない）
  return siteConfigSchema.parse(JSON.parse(raw));
}
