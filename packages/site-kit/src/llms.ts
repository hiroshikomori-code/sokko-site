import type { SiteConfig } from '@sokko/shared';

/**
 * llms.txt（GEO: AI回答エンジン向けサイト要約）を生成する。
 * https://llmstxt.org/ の形式に準拠。
 */
export function buildLlmsTxt(config: SiteConfig): string {
  const { business, meta, aeo, pages } = config;

  const lines: string[] = [
    `# ${business.officeName}`,
    '',
    `> ${aeo.llmsSummary}`,
    '',
    `- 業種: ${business.industryLabel}`,
    `- 所在地: ${business.address}`,
    `- 対応エリア: ${business.serviceAreaCities.join('、')}`,
    `- 営業時間: ${business.businessHours}（定休日: ${business.closedDays}）`,
    `- 電話: ${business.phone}`,
    `- ポジショニング: ${aeo.positioningStatement}`,
    '',
    '## ページ',
    '',
    ...pages.map(
      (p) => `- [${p.title}](${meta.baseUrl}${p.path}): ${p.description}`,
    ),
  ];

  if (aeo.faq.length > 0) {
    lines.push('', '## よくある質問', '');
    for (const f of aeo.faq) {
      lines.push(`- Q: ${f.question}`, `  A: ${f.answer}`);
    }
  }

  return lines.join('\n') + '\n';
}
