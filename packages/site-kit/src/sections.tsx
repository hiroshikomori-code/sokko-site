import type { Section, SiteConfig } from '@sokko/shared';

/**
 * セクションコンポーネント群（純プレゼンテーション層）。
 * props = SiteConfig と Section のみ。fetch・環境変数・Next固有APIに依存しない。
 * トーンは「信頼・誠実」（§13: 派手さより実直）。
 */

type SectionProps = { section: Section; config: SiteConfig };

const container = 'mx-auto w-full max-w-4xl px-5';

function CtaButton({ config }: { config: SiteConfig }) {
  const { cta } = config;
  const href =
    cta.primaryAction === 'phone' || !cta.bookingToolUrl
      ? cta.primaryAction === 'phone' && cta.phone
        ? `tel:${cta.phone}`
        : '/contact'
      : cta.bookingToolUrl;
  return (
    <a
      href={href}
      className="inline-block rounded-md bg-[var(--sk-primary)] px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
    >
      {cta.label}
    </a>
  );
}

export function Hero({ section, config }: SectionProps) {
  const heroImage = config.images?.hero;

  if (heroImage) {
    // 写真あり: 暗めのオーバーレイで文字コントラストを担保（アクセシビリティ要件）
    return (
      <section
        className="relative bg-cover bg-center py-24"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-[rgba(18,20,26,0.62)]" aria-hidden />
        <div className={`${container} relative`}>
          <p className="text-sm font-semibold tracking-wide text-white/80">
            {config.business.serviceAreaCities[0] ?? ''}の{config.business.industryLabel}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-snug text-white sm:text-4xl">
            {section.heading}
          </h1>
          {section.body && (
            <p className="mt-5 max-w-2xl leading-relaxed text-white/90">
              {section.body}
            </p>
          )}
          <div className="mt-8">
            <CtaButton config={config} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[var(--sk-primary-soft)] py-20">
      <div className={container}>
        <p className="text-sm font-semibold tracking-wide text-[var(--sk-primary-strong)]">
          {config.business.serviceAreaCities[0] ?? ''}の{config.business.industryLabel}
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-snug text-[var(--sk-ink)] sm:text-4xl">
          {section.heading}
        </h1>
        {section.body && (
          <p className="mt-5 max-w-2xl leading-relaxed text-[var(--sk-ink-soft)]">
            {section.body}
          </p>
        )}
        <div className="mt-8">
          <CtaButton config={config} />
        </div>
      </div>
    </section>
  );
}

export function Services({ section }: SectionProps) {
  return (
    <section className="py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        {section.body && <SectionLead text={section.body} />}
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {(section.items ?? []).map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)] p-6"
            >
              <h3 className="font-bold text-[var(--sk-ink)]">{item.title}</h3>
              {item.body && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--sk-ink-soft)]">
                  {item.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing({ section }: SectionProps) {
  return (
    <section className="bg-[var(--sk-paper-soft)] py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        {section.body && <SectionLead text={section.body} />}
        <div className="mt-8 overflow-hidden rounded-lg border border-[var(--sk-line)]">
          <table className="w-full bg-[var(--sk-paper)] text-sm">
            <tbody>
              {(section.items ?? []).map((item, i) => (
                <tr
                  key={item.title}
                  className={i > 0 ? 'border-t border-[var(--sk-line)]' : ''}
                >
                  <th className="w-1/2 px-5 py-4 text-left font-medium text-[var(--sk-ink)]">
                    {item.title}
                    {item.body && (
                      <span className="mt-1 block text-xs font-normal text-[var(--sk-ink-soft)]">
                        {item.body}
                      </span>
                    )}
                  </th>
                  <td className="px-5 py-4 text-right font-bold text-[var(--sk-primary-strong)]">
                    {item.meta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--sk-ink-soft)]">
          ※ 内容により変動します。正確なお見積りはお問い合わせください。
        </p>
      </div>
    </section>
  );
}

export function Profile({ section, config }: SectionProps) {
  const b = config.business;
  const photo = config.images?.representative;
  return (
    <section className="py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div className="mt-8 flex flex-col gap-6 rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)] p-8 sm:flex-row">
          {photo && (
            <img
              src={photo}
              alt={`${b.representativeName ?? b.officeName} の写真`}
              width={160}
              height={160}
              loading="lazy"
              className="h-40 w-40 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0">
          {b.representativeName && (
            <p className="text-lg font-bold text-[var(--sk-ink)]">
              {b.representativeName}
              <span className="ml-2 text-sm font-medium text-[var(--sk-ink-soft)]">
                {b.industryLabel}
              </span>
            </p>
          )}
          {b.certifications && (
            <p className="mt-1 text-sm text-[var(--sk-ink-soft)]">{b.certifications}</p>
          )}
          {section.body && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-[var(--sk-ink-soft)]">
              {section.body}
            </p>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ section }: SectionProps) {
  return (
    <section className="bg-[var(--sk-paper-soft)] py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div className="mt-8 space-y-5">
          {(section.items ?? []).map((item) => (
            <figure
              key={item.title}
              className="rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)] p-6"
            >
              <blockquote className="leading-relaxed text-[var(--sk-ink)]">
                {item.body}
              </blockquote>
              <figcaption className="mt-3 text-sm text-[var(--sk-ink-soft)]">
                {item.title}
                {item.meta && <span className="ml-2 text-xs">{item.meta}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Access({ section, config }: SectionProps) {
  const b = config.business;
  const officePhoto = config.images?.office;
  return (
    <section className="py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        {officePhoto && (
          <img
            src={officePhoto}
            alt={`${b.officeName}の外観`}
            loading="lazy"
            className="mt-8 max-h-80 w-full rounded-lg object-cover"
          />
        )}
        <dl className="mt-8 divide-y divide-[var(--sk-line)] overflow-hidden rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)] text-sm">
          {[
            ['所在地', b.address],
            ['電話', b.phone],
            ['営業時間', b.businessHours],
            ['定休日', b.closedDays],
          ].map(([label, value]) => (
            <div key={label} className="flex">
              <dt className="w-28 shrink-0 bg-[var(--sk-paper-soft)] px-5 py-4 font-medium text-[var(--sk-ink)]">
                {label}
              </dt>
              <dd className="px-5 py-4 text-[var(--sk-ink-soft)]">{value}</dd>
            </div>
          ))}
        </dl>
        {section.body && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--sk-ink-soft)]">
            {section.body}
          </p>
        )}
      </div>
    </section>
  );
}

export function Contact({ section, config }: SectionProps) {
  return (
    <section className="bg-[var(--sk-primary-soft)] py-16">
      <div className={`${container} text-center`}>
        {section.heading && <SectionHeading text={section.heading} center />}
        {section.body && (
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-[var(--sk-ink-soft)]">
            {section.body}
          </p>
        )}
        <div className="mt-8">
          <CtaButton config={config} />
        </div>
        <p className="mt-4 text-sm text-[var(--sk-ink-soft)]">
          お電話でのご相談: {config.business.phone}（{config.business.businessHours}）
        </p>
      </div>
    </section>
  );
}

export function Faq({ section, config }: SectionProps) {
  const items = section.items?.length
    ? section.items
    : config.aeo.faq.map((f) => ({ title: f.question, body: f.answer }));
  return (
    <section className="py-16">
      <div className={container}>
        <SectionHeading text={section.heading ?? 'よくある質問'} />
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <details
              key={item.title}
              className="group rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)] p-5"
            >
              <summary className="cursor-pointer list-none font-medium text-[var(--sk-ink)]">
                <span className="mr-2 font-bold text-[var(--sk-primary-strong)]">Q.</span>
                {item.title}
              </summary>
              <p className="mt-3 leading-relaxed text-[var(--sk-ink-soft)]">
                <span className="mr-2 font-bold text-[var(--sk-primary-strong)]">A.</span>
                {item.body}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export type NewsItem = { id: string; body: string; publishedAt: string };

export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--sk-ink-soft)]">お知らせはまだありません。</p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--sk-line)] overflow-hidden rounded-lg border border-[var(--sk-line)] bg-[var(--sk-paper)]">
      {items.map((item) => (
        <li key={item.id} className="px-5 py-4">
          <time className="text-xs text-[var(--sk-ink-soft)]">
            {item.publishedAt.slice(0, 10)}
          </time>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--sk-ink)]">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * トップ用お知らせダイジェスト: 最新3件＋一覧への導線。
 * site-template側ではライブ取得版（LiveNewsDigest）に差し替えられる。
 */
export function NewsDigest({ section, config }: SectionProps) {
  return (
    <section className="border-y border-[var(--sk-line)] bg-[var(--sk-paper-soft)] py-10">
      <div className={container}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-[var(--sk-ink)]">
            {section.heading ?? 'お知らせ'}
          </h2>
          <a
            href="/news"
            className="text-sm font-medium text-[var(--sk-primary-strong)] hover:underline"
          >
            お知らせ一覧へ →
          </a>
        </div>
        <div className="mt-4">
          <NewsList items={config.announcements.baked.slice(0, 3)} />
        </div>
      </div>
    </section>
  );
}

export function News({ section, config }: SectionProps) {
  return (
    <section className="py-16">
      <div className={container}>
        <SectionHeading text={section.heading ?? 'お知らせ'} />
        <div className="mt-8" data-sokko-news>
          <NewsList items={config.announcements.baked} />
        </div>
      </div>
    </section>
  );
}

export function RichText({ section }: SectionProps) {
  return (
    <section className="py-16">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <p className="mt-6 max-w-2xl whitespace-pre-line leading-relaxed text-[var(--sk-ink-soft)]">
          {section.body}
        </p>
      </div>
    </section>
  );
}

export function Cta({ section, config }: SectionProps) {
  return <Contact section={section} config={config} />;
}

function SectionHeading({ text, center }: { text: string; center?: boolean }) {
  return (
    <h2
      className={`text-2xl font-bold text-[var(--sk-ink)] ${center ? 'text-center' : ''}`}
    >
      <span
        className={`mb-2 block h-1 w-10 rounded bg-[var(--sk-primary)] ${center ? 'mx-auto' : ''}`}
        aria-hidden
      />
      {text}
    </h2>
  );
}

function SectionLead({ text }: { text: string }) {
  return (
    <p className="mt-4 max-w-2xl leading-relaxed text-[var(--sk-ink-soft)]">{text}</p>
  );
}
