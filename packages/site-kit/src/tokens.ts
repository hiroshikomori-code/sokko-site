import type { SiteConfig } from '@sokko/shared';

/**
 * デザイントークン → CSS変数。
 * site-template と studio プレビューが同じ変数を使うことで見た目が一致する。
 *
 * バリアント（design.variant・Step2で選択）で見た目だけを切り替える。
 * コンポーネント側は必ず変数経由で参照し、バリアント分岐をJSXに持ち込まない:
 * - classic: 上質・信頼（明朝見出し×温白紙×真鍮ルール）
 * - future : 先進・近未来（ダーク×発光アクセント×極太ゴシック）
 * - warm   : 温かみ・親しみ（丸ゴシック×大きな角丸×柔らかい配色）
 *
 * 命名の約束:
 * - --sk-gold は「装飾ライン専用」（バリアントによっては金色でなくネオン等になる）
 * - --sk-gold-text は小さなテキスト用（背景とのコントラストを各バリアントで担保）
 */
export function cssVariables(design: SiteConfig['design']): Record<string, string> {
  const primary = design.primaryColor;
  const variant = design.variant ?? 'classic';

  if (variant === 'future') {
    return {
      '--sk-primary': primary,
      '--sk-primary-soft': `color-mix(in srgb, ${primary} 22%, #0c0f16)`,
      // ダーク背景上のリンク・強調テキストは明るい側に寄せる
      '--sk-primary-strong': `color-mix(in srgb, ${primary} 55%, white)`,
      '--sk-deep': `color-mix(in srgb, ${primary} 30%, #05070c)`,
      '--sk-ink': '#eef1f7',
      '--sk-ink-soft': '#a3abbd',
      '--sk-paper': '#0c0f16',
      '--sk-paper-soft': '#12161f',
      '--sk-line': '#232a3a',
      '--sk-gold': `color-mix(in srgb, ${primary} 45%, #67e8f9)`,
      '--sk-gold-text': `color-mix(in srgb, ${primary} 30%, #a5f3fc)`,
      '--sk-font-display': 'inherit',
      '--sk-display-weight': '900',
      '--sk-radius': '10px',
      '--sk-shadow-card': '0 0 0 1px rgba(255,255,255,0.02)',
      '--sk-shadow-card-hover': `0 8px 40px color-mix(in srgb, ${primary} 35%, transparent)`,
    };
  }

  if (variant === 'warm') {
    return {
      '--sk-primary': primary,
      '--sk-primary-soft': `color-mix(in srgb, ${primary} 10%, #fffdf9)`,
      '--sk-primary-strong': `color-mix(in srgb, ${primary} 80%, black)`,
      '--sk-deep': `color-mix(in srgb, ${primary} 70%, #2a2119)`,
      '--sk-ink': '#3a352e',
      '--sk-ink-soft': '#6e6559',
      '--sk-paper': '#fffdf9',
      '--sk-paper-soft': '#faf3e9',
      '--sk-line': '#efe5d6',
      '--sk-gold': `color-mix(in srgb, ${primary} 40%, #f2c078)`,
      '--sk-gold-text': `color-mix(in srgb, ${primary} 45%, #7a5a2e)`,
      '--sk-font-display':
        "'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', 'BIZ UDGothic', sans-serif",
      '--sk-display-weight': '700',
      '--sk-radius': '16px',
      '--sk-shadow-card': '0 2px 8px rgba(58,48,30,0.06)',
      '--sk-shadow-card-hover': '0 14px 40px rgba(58,48,30,0.12)',
    };
  }

  // classic（既定）
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
    // 端末内蔵の明朝を使う（和文セリフのWebフォントは700KB級で品質ゲートを壊すため不採用）
    '--sk-font-display':
      "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
    '--sk-display-weight': '600',
    '--sk-radius': '2px',
    '--sk-shadow-card': '0 1px 2px rgba(28,25,20,0.04)',
    '--sk-shadow-card-hover': '0 12px 32px rgba(28,25,20,0.10)',
  };
}

export function cssVariablesString(design: SiteConfig['design']): string {
  return Object.entries(cssVariables(design))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
