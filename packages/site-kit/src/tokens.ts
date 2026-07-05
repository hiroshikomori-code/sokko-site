import type { SiteConfig } from '@sokko/shared';

/**
 * デザイントークン → CSS変数。
 * site-template と studio プレビューが同じ変数を使うことで見た目が一致する。
 */
export function cssVariables(design: SiteConfig['design']): Record<string, string> {
  const primary = design.primaryColor;
  return {
    '--sk-primary': primary,
    '--sk-primary-soft': `color-mix(in srgb, ${primary} 8%, white)`,
    '--sk-primary-strong': `color-mix(in srgb, ${primary} 85%, black)`,
    '--sk-ink': '#1c1917',
    '--sk-ink-soft': '#57534e',
    '--sk-paper': '#ffffff',
    '--sk-paper-soft': '#fafaf9',
    '--sk-line': '#e7e5e4',
  };
}

export function cssVariablesString(design: SiteConfig['design']): string {
  return Object.entries(cssVariables(design))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
