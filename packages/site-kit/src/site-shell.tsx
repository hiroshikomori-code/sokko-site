import { NAV_LABELS, type SiteConfig } from '@sokko/shared';
import { cssVariables } from './tokens';

/**
 * サイト全体のシェル（ヘッダー・ナビ・フッター）。
 * リンクは素の<a>を使う（Next非依存＝studioプレビューでもそのまま動く）。
 * デザインは「上質・信頼感」: 明朝体の屋号、主色→真鍮のトップライン、深色フッター。
 */

const display =
  'font-[family-name:var(--sk-font-display)] [font-weight:var(--sk-display-weight)] tracking-wide [font-feature-settings:"palt"]';

/**
 * スクロール連動の控えめなフェードイン（CSSのみ・JS不要）。
 * - reduced-motion指定時は無効
 * - animation-timeline非対応ブラウザ（Safari等）は@supportsで自動的に静的表示
 * - aria-hidden（装飾レイヤー）は動かさない
 */
const REVEAL_CSS =
  '@media (prefers-reduced-motion: no-preference){@supports (animation-timeline: view()){main section > div:not([aria-hidden]){animation:sk-rise .8s cubic-bezier(.2,.7,.3,1) both;animation-timeline:view();animation-range:entry 0% entry 45%}}}@keyframes sk-rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}';

export function SiteShell({
  config,
  currentPath,
  children,
}: {
  config: SiteConfig;
  currentPath: string;
  children: React.ReactNode;
}) {
  const b = config.business;
  return (
    <div
      style={cssVariables(config.design) as React.CSSProperties}
      data-sk-variant={config.design.variant ?? 'classic'}
      className="min-h-screen bg-[var(--sk-paper)] font-sans text-[var(--sk-ink)] antialiased"
    >
      <style dangerouslySetInnerHTML={{ __html: REVEAL_CSS }} />
      <div
        aria-hidden
        className="h-0.5 bg-gradient-to-r from-[var(--sk-primary)] via-[var(--sk-gold)] to-[var(--sk-primary)]"
      />
      <header className="border-b border-[var(--sk-line)] bg-[var(--sk-paper)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <a
            href="/"
            className={`flex min-w-0 items-center gap-3 text-xl text-[var(--sk-ink)] ${display}`}
          >
            {config.design.logoPath && (
              <img src={config.design.logoPath} alt="" className="h-10 w-auto" />
            )}
            <span className="truncate">{b.officeName}</span>
          </a>
          <div className="hidden shrink-0 text-right sm:block">
            <p className={`text-lg leading-tight text-[var(--sk-ink)] ${display}`}>
              {b.phone}
            </p>
            <p className="mt-0.5 text-xs tracking-wide text-[var(--sk-ink-soft)]">
              {b.businessHours}
            </p>
          </div>
        </div>
        <nav
          aria-label="サイト内メニュー"
          className="border-t border-[var(--sk-line)]"
        >
          {/* モバイル: 横スクロール / デスクトップ: 折り返し（見切れ防止） */}
          <div className="mx-auto w-full max-w-5xl overflow-x-auto px-5">
            <ul className="flex min-w-max gap-2 text-sm sm:min-w-0 sm:flex-wrap">
              {config.pages.map((p) => (
                <li key={p.key}>
                  <a
                    href={p.path}
                    aria-current={currentPath === p.path ? 'page' : undefined}
                    className={`block whitespace-nowrap px-3 py-3 tracking-wide ${
                      currentPath === p.path
                        ? 'font-bold text-[var(--sk-primary-strong)] shadow-[inset_0_-2px_0_var(--sk-gold)]'
                        : 'text-[var(--sk-ink-soft)] transition-colors hover:text-[var(--sk-ink)]'
                    }`}
                  >
                    {p.navLabel ?? NAV_LABELS[p.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      {/* 直前がCTA帯（同じ深色）でも自然につながるよう、余白は挟まない */}
      <footer className="bg-[var(--sk-deep)] text-white/75">
        <div
          aria-hidden
          className="h-px bg-gradient-to-r from-transparent via-[var(--sk-gold)] to-transparent"
        />
        <div className="mx-auto w-full max-w-5xl px-5 py-14">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div>
              <p className={`text-lg text-white ${display}`}>{b.officeName}</p>
              <p className="mt-4 text-sm leading-relaxed">{b.address}</p>
              <p className="mt-1 text-sm">
                {b.phone}（{b.businessHours} / 定休日: {b.closedDays}）
              </p>
            </div>
            <nav aria-label="フッターメニュー">
              <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
                {config.pages.map((p) => (
                  <li key={p.key}>
                    <a
                      href={p.path}
                      className="transition-colors hover:text-white"
                    >
                      {p.navLabel ?? NAV_LABELS[p.key]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {/* white/50はコントラスト4.49でWCAG AA(4.5)にわずかに届かない */}
          <p className="mt-12 text-xs text-white/65">© {b.officeName}</p>
        </div>
      </footer>
    </div>
  );
}
