import { parseHTML } from 'linkedom';
import { PROHIBITED_EXPRESSIONS, type SiteConfig } from '@sokko/shared';

/**
 * 自前軽量チェッカー（計画5章）。
 * 静的HTMLをfetch＋パースして検証する（ヘッドレスブラウザは持たない）。
 * level: 'block' = 公開不可 / 'warn' = 承認者の明示チェックで通過可
 */

export type CheckFinding = {
  level: 'block' | 'warn';
  path: string;
  code: string;
  message: string;
};

export async function checkSite(
  baseUrl: string,
  config: SiteConfig,
): Promise<CheckFinding[]> {
  const findings: CheckFinding[] = [];
  const seenLinks = new Set<string>();

  // llms.txt / sitemap / robots の存在（AEO要件）
  for (const file of ['/llms.txt', '/sitemap.xml', '/robots.txt']) {
    const res = await fetchSafe(`${baseUrl}${file}`);
    if (!res || res.status !== 200) {
      findings.push({
        level: 'block',
        path: file,
        code: 'aeo_file_missing',
        message: `${file} が配信されていません`,
      });
    }
  }

  let jsonLdSeen = false;

  for (const page of config.pages) {
    const url = `${baseUrl}${page.path}`;
    const res = await fetchSafe(url);
    if (!res || res.status !== 200) {
      findings.push({
        level: 'block',
        path: page.path,
        code: 'page_unreachable',
        message: `ページが表示できません（${res?.status ?? 'fetch失敗'}）`,
      });
      continue;
    }
    const html = await res.text();
    const { document } = parseHTML(html);

    // メタ・OGP
    const title = document.querySelector('title')?.textContent?.trim();
    if (!title) {
      findings.push({
        level: 'block',
        path: page.path,
        code: 'title_missing',
        message: 'titleタグがありません',
      });
    }
    if (!document.querySelector('meta[name="description"]')?.getAttribute('content')) {
      findings.push({
        level: 'block',
        path: page.path,
        code: 'description_missing',
        message: 'meta descriptionがありません',
      });
    }
    if (!document.querySelector('meta[property="og:title"]')) {
      findings.push({
        level: 'warn',
        path: page.path,
        code: 'ogp_missing',
        message: 'OGPタグがありません',
      });
    }

    // JSON-LD（トップに必須）
    const jsonLdBlocks = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ];
    for (const block of jsonLdBlocks) {
      try {
        JSON.parse(block.textContent ?? '');
        jsonLdSeen = true;
      } catch {
        findings.push({
          level: 'block',
          path: page.path,
          code: 'jsonld_invalid',
          message: 'JSON-LDが不正なJSONです',
        });
      }
    }

    // img alt（アクセシビリティはPSIも見るが、altは機械で確実に検査できる）
    for (const img of document.querySelectorAll('img')) {
      if (!img.hasAttribute('alt')) {
        findings.push({
          level: 'block',
          path: page.path,
          code: 'img_alt_missing',
          message: 'alt属性のない画像があります',
        });
        break;
      }
    }

    // 禁止表現（§13 広告規制ガードの最終機械チェック）
    // CSSインライン化で<style>本文がHTMLに含まれるため、可視テキストだけを走査する
    // （TailwindのCSS変数「--tw-…:100%」等を誤検知しないように）
    const body = document.querySelector('body');
    body?.querySelectorAll('style,script,noscript,template').forEach((el) => el.remove());
    const bodyText = (body?.textContent ?? '').replace(/\s+/g, ' ');
    for (const expression of PROHIBITED_EXPRESSIONS) {
      const at = bodyText.indexOf(expression);
      if (at >= 0) {
        // 該当箇所の前後を引用（オペレーターが自力で場所を特定できるように）
        const excerpt = bodyText
          .slice(Math.max(0, at - 25), at + expression.length + 25)
          .trim();
        findings.push({
          level: 'block',
          path: page.path,
          code: 'prohibited_expression',
          message: `広告規制上問題になりうる表現「${expression}」が含まれています → 「…${excerpt}…」（文言編集で修正できます）`,
        });
      }
    }

    // 内部リンク切れ（外部リンクは相手サーバー次第で偽陽性が出るためwarn止まり）
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) {
        continue;
      }
      const isInternal = href.startsWith('/');
      const linkUrl = isInternal ? `${baseUrl}${href}` : href;
      if (seenLinks.has(linkUrl)) continue;
      seenLinks.add(linkUrl);

      let linkRes = await fetchSafe(linkUrl, 'HEAD');
      let broken = !linkRes || linkRes.status >= 400;
      if (broken) {
        // デプロイ直後はエッジ伝播前で404になることがある → 3秒待って1回だけ再確認
        await new Promise((resolve) => setTimeout(resolve, 3000));
        linkRes = await fetchSafe(linkUrl, 'HEAD');
        broken = !linkRes || linkRes.status >= 400;
      }
      if (broken) {
        findings.push({
          level: isInternal ? 'block' : 'warn',
          path: page.path,
          code: isInternal ? 'internal_link_broken' : 'external_link_suspect',
          message: `リンク切れの可能性: ${href}（${linkRes?.status ?? 'fetch失敗'}）`,
        });
      }
    }
  }

  if (!jsonLdSeen) {
    findings.push({
      level: 'block',
      path: '/',
      code: 'jsonld_missing',
      message: '構造化データ（JSON-LD）が出力されていません',
    });
  }

  return findings;
}

async function fetchSafe(
  url: string,
  method: 'GET' | 'HEAD' = 'GET',
): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'sokko-quality-gate/1.0' },
    });
    // HEADを拒むサーバーはGETで再確認
    if (method === 'HEAD' && res.status === 405) {
      return fetchSafe(url, 'GET');
    }
    return res;
  } catch {
    return null;
  }
}
