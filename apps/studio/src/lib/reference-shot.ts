/**
 * 参考サイトのスクリーンショット取得（Phase4: 参考URLのAIビジョン反映）。
 * 品質ゲートでも使っているPageSpeed Insights APIの final-screenshot を流用する
 * （ヘッドレスブラウザを自前で持たない方針のまま、任意の公開URLの見た目を得られる）。
 * 失敗・タイムアウト時は null（呼び出し側はURL文字列だけで従来どおり提案する）。
 */
export async function fetchReferenceScreenshot(
  url: string,
): Promise<{ mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string } | null> {
  try {
    const params = new URLSearchParams({
      url,
      strategy: 'DESKTOP',
      category: 'PERFORMANCE',
    });
    const key = process.env.PAGESPEED_API_KEY;
    if (key) params.set('key', key);

    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
      { signal: AbortSignal.timeout(40_000), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      lighthouseResult?: {
        audits?: Record<string, { details?: { data?: string } }>;
      };
    };
    const data =
      json.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
    if (!data) return null;

    const match = data.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) return null;
    return {
      mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp',
      base64: match[2],
    };
  } catch (err) {
    console.error('fetchReferenceScreenshot failed:', err);
    return null;
  }
}
