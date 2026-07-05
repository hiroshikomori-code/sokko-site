/**
 * PageSpeed Insights API（計画5章）。
 * Lighthouseのパフォーマンス＋アクセシビリティスコアを公開URLに対して計測する。
 * 無料枠 25,000クエリ/日 — 本用途では事実上無制限。
 * PAGESPEED_API_KEY は任意（低頻度ならキー無しでも動くが、設定推奨）。
 */

export type PsiScore = {
  path: string;
  performance: number | null;
  accessibility: number | null;
  error?: string;
};

export async function measurePage(
  baseUrl: string,
  path: string,
): Promise<PsiScore> {
  const target = `${baseUrl}${path}`;
  const params = new URLSearchParams({
    url: target,
    strategy: 'mobile',
  });
  params.append('category', 'performance');
  params.append('category', 'accessibility');
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set('key', key);

  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
      { signal: AbortSignal.timeout(120_000) },
    );
    if (!res.ok) {
      return {
        path,
        performance: null,
        accessibility: null,
        error: `PSI ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: {
          performance?: { score?: number };
          accessibility?: { score?: number };
        };
      };
    };
    const categories = data.lighthouseResult?.categories;
    const toPct = (s?: number) =>
      typeof s === 'number' ? Math.round(s * 100) : null;
    return {
      path,
      performance: toPct(categories?.performance?.score),
      accessibility: toPct(categories?.accessibility?.score),
    };
  } catch (err) {
    return {
      path,
      performance: null,
      accessibility: null,
      error: err instanceof Error ? err.message : 'PSI計測に失敗',
    };
  }
}

/**
 * 計測対象を絞る: PSIは1URL 30〜60秒かかるため、代表ページのみ計測する
 * （同一テンプレなので他ページのスコアはほぼ同一。全ページの静的検査は checker.ts が担う）。
 */
export const PSI_TARGET_PATHS = ['/', '/pricing'];

export async function measureSite(baseUrl: string): Promise<PsiScore[]> {
  // スコア揺れ対策: 失敗時は1回だけ自動再計測（計画5章）
  return Promise.all(
    PSI_TARGET_PATHS.map(async (path) => {
      const first = await measurePage(baseUrl, path);
      if (first.performance !== null) return first;
      return measurePage(baseUrl, path);
    }),
  );
}
