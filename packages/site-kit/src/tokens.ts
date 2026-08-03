import type { SiteConfig } from '@sokko/shared';

/**
 * デザイントークン → CSS変数。
 * site-template と studio プレビューが同じ変数を使うことで見た目が一致する。
 *
 * バリアント（design.variant・Step2で選択）で見た目だけを切り替える。
 * コンポーネント側は必ず変数経由で参照し、バリアント分岐をJSXに持ち込まない:
 * - classic  : 上質・信頼（明朝見出し×温白紙×真鍮ルール）
 * - future   : 先進・近未来（ダーク×発光アクセント×極太ゴシック）
 * - warm     : 温かみ・親しみ（丸ゴシック×大きな角丸×柔らかい配色）
 * - minimal  : ミニマル・洗練（純白×細身ゴシック×装飾最小）
 * - editorial: エディトリアル・知的（太い明朝×濃い罫線×紙面構成）
 * - craft    : クラフト・実直（クラフト紙×太ゴシック×茶系）
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

  if (variant === 'minimal') {
    return {
      '--sk-primary': primary,
      '--sk-primary-soft': `color-mix(in srgb, ${primary} 5%, #ffffff)`,
      '--sk-primary-strong': `color-mix(in srgb, ${primary} 70%, black)`,
      '--sk-deep': `color-mix(in srgb, ${primary} 18%, #17181a)`,
      '--sk-ink': '#17181a',
      '--sk-ink-soft': '#7a7d82',
      '--sk-paper': '#ffffff',
      '--sk-paper-soft': '#f7f7f8',
      '--sk-line': '#e8e9eb',
      // 装飾ラインは金でなく墨の細線（ミニマルは色数を絞る）
      '--sk-gold': `color-mix(in srgb, ${primary} 30%, #17181a)`,
      '--sk-gold-text': `color-mix(in srgb, ${primary} 55%, #4b4e54)`,
      '--sk-font-display': 'inherit',
      '--sk-display-weight': '500',
      '--sk-radius': '0px',
      '--sk-shadow-card': '0 0 0 1px #ececee',
      '--sk-shadow-card-hover': '0 10px 30px rgba(23,24,26,0.08)',
    };
  }

  if (variant === 'editorial') {
    return {
      '--sk-primary': primary,
      '--sk-primary-soft': `color-mix(in srgb, ${primary} 6%, #fbfaf8)`,
      '--sk-primary-strong': `color-mix(in srgb, ${primary} 80%, black)`,
      '--sk-deep': `color-mix(in srgb, ${primary} 55%, #14120d)`,
      '--sk-ink': '#1c1b18',
      '--sk-ink-soft': '#57544c',
      '--sk-paper': '#fbfaf8',
      '--sk-paper-soft': '#f2f0ea',
      '--sk-line': '#c9c4b8',
      // 雑誌の見出し罫のような濃い差し色（主色を濃く沈める）
      '--sk-gold': `color-mix(in srgb, ${primary} 75%, #1c1b18)`,
      '--sk-gold-text': `color-mix(in srgb, ${primary} 70%, #3a382f)`,
      '--sk-font-display':
        "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
      '--sk-display-weight': '700',
      '--sk-radius': '0px',
      '--sk-shadow-card': '0 0 0 1px #e3dfd4',
      '--sk-shadow-card-hover': '0 12px 32px rgba(28,27,24,0.10)',
    };
  }

  if (variant === 'craft') {
    return {
      '--sk-primary': primary,
      '--sk-primary-soft': `color-mix(in srgb, ${primary} 9%, #f5efe6)`,
      '--sk-primary-strong': `color-mix(in srgb, ${primary} 75%, #2b2115)`,
      '--sk-deep': `color-mix(in srgb, ${primary} 45%, #2b2115)`,
      '--sk-ink': '#33291d',
      '--sk-ink-soft': '#6f6250',
      '--sk-paper': '#f5efe6',
      '--sk-paper-soft': '#ece3d4',
      '--sk-line': '#d9cbb6',
      // 銅・レザーの装飾色（手仕事の質感）
      '--sk-gold': '#a9805a',
      '--sk-gold-text': '#7c5b38',
      '--sk-font-display': 'inherit',
      '--sk-display-weight': '800',
      '--sk-radius': '6px',
      '--sk-shadow-card': '0 2px 6px rgba(51,41,29,0.08)',
      '--sk-shadow-card-hover': '0 14px 36px rgba(51,41,29,0.14)',
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
