import { NAV_LABELS, type SiteConfig } from '@sokko/shared';
import { cssVariables } from './tokens';

/**
 * サイト全体のシェル（ヘッダー・ナビ・フッター）。
 * リンクは素の<a>を使う（Next非依存＝studioプレビューでもそのまま動く）。
 */
export function SiteShell({
  config,
  currentPath,
  children,
}: {
  config: SiteConfig;
  currentPath: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={cssVariables(config.design) as React.CSSProperties}
      className="min-h-screen bg-[var(--sk-paper)] font-sans text-[var(--sk-ink)]"
    >
      <header className="border-b border-[var(--sk-line)] bg-[var(--sk-paper)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3 text-lg font-bold text-[var(--sk-ink)]">
            {config.design.logoPath && (
              <img
                src={config.design.logoPath}
                alt=""
                className="h-9 w-auto"
              />
            )}
            {config.business.officeName}
          </a>
          <p className="hidden text-sm text-[var(--sk-ink-soft)] sm:block">
            {config.business.phone}
          </p>
        </div>
        <nav
          aria-label="サイト内メニュー"
          className="border-t border-[var(--sk-line)] bg-[var(--sk-paper-soft)]"
        >
          {/* モバイル: 横スクロール / デスクトップ: 折り返し（見切れ防止） */}
          <div className="mx-auto w-full max-w-4xl overflow-x-auto px-5">
            <ul className="flex min-w-max gap-1 text-sm sm:min-w-0 sm:flex-wrap">
              {config.pages.map((p) => (
                <li key={p.key}>
                  <a
                    href={p.path}
                    aria-current={currentPath === p.path ? 'page' : undefined}
                    className={`block whitespace-nowrap px-3 py-2.5 ${
                      currentPath === p.path
                        ? 'font-bold text-[var(--sk-primary-strong)] shadow-[inset_0_-2px_0_var(--sk-primary)]'
                        : 'text-[var(--sk-ink-soft)] hover:text-[var(--sk-ink)]'
                    }`}
                  >
                    {NAV_LABELS[p.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="mt-8 border-t border-[var(--sk-line)] bg-[var(--sk-paper-soft)]">
        <div className="mx-auto w-full max-w-4xl px-5 py-10 text-sm text-[var(--sk-ink-soft)]">
          <p className="font-bold text-[var(--sk-ink)]">
            {config.business.officeName}
          </p>
          <p className="mt-2">{config.business.address}</p>
          <p className="mt-1">
            {config.business.phone}（{config.business.businessHours} / 定休日:{' '}
            {config.business.closedDays}）
          </p>
          <p className="mt-6 text-xs">
            © {config.business.officeName}
          </p>
        </div>
      </footer>
    </div>
  );
}
