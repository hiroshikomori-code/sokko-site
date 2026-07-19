import type { SiteConfig } from '@sokko/shared';

/**
 * デザイントークン → CSS変数。
 * site-template と studio プレビューが同じ変数を使うことで見た目が一致する。
 *
 * デザイン方針は「上質・信頼感」:
 * - 見出しは明朝体（--sk-font-display。テンプレ側が --font-serif-jp を注入）
 * - 真鍮色（gold）は装飾ルール専用。本文テキストには使わない
 *   （小さなテキストに使う場合はコントラストを確保した --sk-gold-text）
 * - 紙は純白でなく温かみのある白。罫線も温色系のヘアライン
 */
export function cssVariables(design: SiteConfig['design']): Record<string, string> {
  const primary = design.primaryColor;
  return {
    '--sk-primary': primary,
    '--sk-primary-soft': `color-mix(in srgb, ${primary} 7%, #fdfcfa)`,
    '--sk-primary-strong': `color-mix(in srgb, ${primary} 85%, black)`,
    // フッター・CTA帯の深色（主色を暖かい黒に沈める）
    '--sk-deep': `color-mix(in srgb, ${primary} 55%, #16130e)`,
    '--sk-ink': '#211d16',
    '--sk-ink-soft': '#5c5546',
    '--sk-paper': '#fdfcfa',
    '--sk-paper-soft': '#f6f3ec',
    '--sk-line': '#e7e2d7',
    '--sk-gold': '#bfa268',
    '--sk-gold-text': '#78633a',
    '--sk-font-display':
      "var(--font-serif-jp, 'Hiragino Mincho ProN'), 'Yu Mincho', 'Noto Serif JP', serif",
  };
}

export function cssVariablesString(design: SiteConfig['design']): string {
  return Object.entries(cssVariables(design))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
