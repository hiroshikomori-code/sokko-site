import type { Section, SiteConfig } from '@sokko/shared';

/**
 * セクションコンポーネント群（純プレゼンテーション層）。
 * props = SiteConfig と Section のみ。fetch・環境変数・Next固有APIに依存しない。
 * トーンは「上質・信頼感」（§13: 派手さより実直。明朝体見出し×余白×真鍮の装飾ルール）。
 */

type SectionProps = { section: Section; config: SiteConfig };

const container = 'mx-auto w-full max-w-5xl px-5';

/** 明朝体見出し（palt=和文詰め）。ウェイトはテンプレ側で600/700を読み込む */
const display =
  'font-[family-name:var(--sk-font-display)] [font-weight:var(--sk-display-weight)] tracking-wide [font-feature-settings:"palt"]';

/** 小さな冠テキスト＋真鍮ルール（セクションやヒーローの肩書き行） */
function Kicker({
  text,
  light,
  center,
}: {
  text: string;
  light?: boolean;
  center?: boolean;
}) {
  if (!text) return null;
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold tracking-[0.22em] ${
        center ? 'justify-center' : ''
      } ${light ? 'text-white/75' : 'text-[var(--sk-gold-text)]'}`}
    >
      <span aria-hidden className="inline-block h-px w-10 bg-[var(--sk-gold)]" />
      {text}
      {center && (
        <span aria-hidden className="inline-block h-px w-10 bg-[var(--sk-gold)]" />
      )}
    </p>
  );
}

/**
 * future限定: ヒーローの発光ネットワーク背景（約1.5KBのバニラJS）。
 * - prefers-reduced-motion時は描画しない（静止画のまま）
 * - 粒子数は幅に応じて最大40、色は --sk-gold（発光アクセント）を継承
 * - 静的エクスポート・studioプレビューの両方でそのまま動く
 */
const AMBIENT_SCRIPT =
  "(function(){var s=document.currentScript;if(!s)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;function start(){var host=s.parentElement;if(!host)return;var c=document.createElement('canvas');c.setAttribute('aria-hidden','true');c.className='absolute inset-0 h-full w-full opacity-60';host.insertBefore(c,s);var x=c.getContext('2d');if(!x)return;var W,H;function size(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight}size();addEventListener('resize',size);var N=Math.min(40,Math.floor((W||1200)/32)),P=[];for(var i=0;i<N;i++)P.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.0008,vy:(Math.random()-.5)*.0008});var accent=(getComputedStyle(c).getPropertyValue('--sk-gold')||'#67e8f9').trim();var R=150;function tick(){x.clearRect(0,0,W,H);var i,j;for(i=0;i<N;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1}x.strokeStyle=accent;for(i=0;i<N;i++)for(j=i+1;j<N;j++){var a=P[i],b=P[j],dx=(a.x-b.x)*W,dy=(a.y-b.y)*H,d=dx*dx+dy*dy;if(d<R*R){x.globalAlpha=.14*(1-d/(R*R));x.beginPath();x.moveTo(a.x*W,a.y*H);x.lineTo(b.x*W,b.y*H);x.stroke()}}x.fillStyle=accent;x.globalAlpha=.7;for(i=0;i<N;i++){x.beginPath();x.arc(P[i].x*W,P[i].y*H,1.6,0,6.2832);x.fill()}requestAnimationFrame(tick)}requestAnimationFrame(tick)}if(document.readyState==='complete'){setTimeout(start,0)}else{addEventListener('load',function(){setTimeout(start,120)})}})();";

function HeroAmbient({ config }: { config: SiteConfig }) {
  if ((config.design.variant ?? 'classic') !== 'future') return null;
  // canvasはハイドレーション完了後（load後）にスクリプトが動的挿入する。
  // Reactにcanvasを管理させると、サイズ設定でhydration mismatchになるため
  return <script dangerouslySetInnerHTML={{ __html: AMBIENT_SCRIPT }} />;
}

function CtaButton({ config, light }: { config: SiteConfig; light?: boolean }) {
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
      className={`inline-block rounded-[var(--sk-radius)] px-10 py-4 text-sm font-bold tracking-wider shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        light
          ? 'bg-white text-neutral-900'
          : 'bg-[var(--sk-primary)] text-white'
      }`}
    >
      {cta.label}
    </a>
  );
}

export function Hero({ section, config }: SectionProps) {
  const heroImage = config.images?.hero;
  const heroSm = config.images?.heroSm;
  const kicker = `${config.business.serviceAreaCities[0] ?? ''}の${config.business.industryLabel}`;
  // レイアウト型: photo(全面写真)/split(左右分割)/typo(タイポ主役)。写真なしは常にtypo
  const layout = heroImage ? (section.layout === 'split' ? 'split' : 'photo') : 'typo';

  if (layout === 'split' && heroImage) {
    return (
      <section
        data-sk-layout="split"
        className="relative overflow-hidden border-b border-[var(--sk-line)] bg-[var(--sk-paper)]"
      >
        <div className="grid lg:grid-cols-2">
          <div className="relative flex items-center px-5 py-20 sm:px-10 lg:py-28">
            <div className="w-full max-w-xl lg:ml-auto lg:pr-14">
              <Kicker text={kicker} />
              <h1
                className={`mt-6 text-3xl leading-[1.4] text-[var(--sk-ink)] sm:text-4xl ${display}`}
              >
                {section.heading}
              </h1>
              {section.body && (
                <p className="mt-6 leading-loose text-[var(--sk-ink-soft)]">
                  {section.body}
                </p>
              )}
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <CtaButton config={config} />
                <p className="text-sm tracking-wide text-[var(--sk-ink-soft)]">
                  お電話でのご相談　{config.business.phone}
                </p>
              </div>
            </div>
          </div>
          <div className="relative min-h-[320px] lg:min-h-[560px]">
            <img
              src={heroImage}
              srcSet={heroSm ? `${heroSm} 750w, ${heroImage} 1600w` : undefined}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 hidden w-1 bg-[var(--sk-gold)] lg:block"
            />
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'photo' && heroImage) {
    // 写真あり: 左を深く沈めたグラデーションで文字コントラストを担保（アクセシビリティ要件）
    // 背景はCSSでなく<img>にする: LCP要素として高優先で取得され、srcsetで
    // モバイルに縮小版を配れる（CSS背景は両方できない）
    return (
      <section
        data-sk-layout="photo"
        className="relative overflow-hidden bg-[var(--sk-deep)]"
      >
        <img
          src={heroImage}
          srcSet={heroSm ? `${heroSm} 750w, ${heroImage} 1600w` : undefined}
          sizes="100vw"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(105deg,rgba(16,17,22,0.82)_25%,rgba(16,17,22,0.38))]"
          aria-hidden
        />
        <HeroAmbient config={config} />
        <div className={`${container} relative py-28 sm:py-36`}>
          <Kicker text={kicker} light />
          <h1
            className={`mt-6 max-w-3xl text-3xl leading-[1.45] text-white sm:text-[2.75rem] ${display}`}
          >
            {section.heading}
          </h1>
          {section.body && (
            <p className="mt-7 max-w-2xl leading-loose text-white/85">
              {section.body}
            </p>
          )}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <CtaButton config={config} />
            <p className="text-sm tracking-wide text-white/75">
              お電話でのご相談　{config.business.phone}
            </p>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--sk-gold)] to-transparent"
          aria-hidden
        />
      </section>
    );
  }

  return (
    <section
      data-sk-layout="typo"
      className="relative overflow-hidden border-b border-[var(--sk-line)] bg-[var(--sk-paper-soft)]"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-15%,var(--sk-primary-soft),transparent)]"
        aria-hidden
      />
      <HeroAmbient config={config} />
      <div className={`${container} relative py-28 sm:py-40`}>
        <Kicker text={kicker} />
        <h1
          className={`mt-8 max-w-4xl text-4xl leading-[1.3] text-[var(--sk-ink)] sm:text-6xl sm:leading-[1.22] ${display}`}
        >
          {section.heading}
        </h1>
        {section.body && (
          <p className="mt-8 max-w-2xl text-lg leading-loose text-[var(--sk-ink-soft)]">
            {section.body}
          </p>
        )}
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          <CtaButton config={config} />
          <p className="text-sm tracking-wide text-[var(--sk-ink-soft)]">
            お電話でのご相談　{config.business.phone}
          </p>
        </div>
      </div>
    </section>
  );
}

export function Services({ section, config }: SectionProps) {
  const layout = section.layout ?? 'cards';

  // ジグザグ型: 事例写真と文章を左右交互に（写真がある事業者の説得力を最大化）
  if (layout === 'zigzag') {
    const works = config.images?.works ?? [];
    return (
      <section data-sk-layout="zigzag" className="py-20">
        <div className={container}>
          {section.heading && <SectionHeading text={section.heading} />}
          {section.body && <SectionLead text={section.body} />}
          <div className="mt-12 space-y-16">
            {(section.items ?? []).map((item, i) => {
              const photo = works.length > 0 ? works[i % works.length] : undefined;
              return (
                <div key={item.title} className="grid items-center gap-8 lg:grid-cols-2">
                  {photo && (
                    <div
                      className={`aspect-[4/3] overflow-hidden rounded-[var(--sk-radius)] border border-[var(--sk-line)] shadow-[var(--sk-shadow-card)] ${
                        i % 2 === 1 ? 'lg:order-2' : ''
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={photo.caption ?? item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                    <p className={`text-sm text-[var(--sk-gold-text)] ${display}`}>
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className={`mt-2 text-2xl text-[var(--sk-ink)] ${display}`}>
                      {item.title}
                    </h3>
                    {item.body && (
                      <p className="mt-4 leading-loose text-[var(--sk-ink-soft)]">
                        {item.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // 番号リスト型: 大きな番号×罫線の雑誌的レイアウト（写真がなくても間が持つ）
  if (layout === 'numbered') {
    return (
      <section data-sk-layout="numbered" className="py-20">
        <div className={container}>
          {section.heading && <SectionHeading text={section.heading} />}
          {section.body && <SectionLead text={section.body} />}
          <div className="mt-10 divide-y divide-[var(--sk-line)] border-y border-[var(--sk-line)]">
            {(section.items ?? []).map((item, i) => (
              <div key={item.title} className="grid gap-4 py-10 sm:grid-cols-[6.5rem_1fr]">
                <p className={`text-5xl leading-none text-[var(--sk-gold)] ${display}`}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div>
                  <h3 className={`text-xl text-[var(--sk-ink)] ${display}`}>{item.title}</h3>
                  {item.body && (
                    <p className="mt-3 leading-loose text-[var(--sk-ink-soft)]">{item.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-sk-layout="cards" className="py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        {section.body && <SectionLead text={section.body} />}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {(section.items ?? []).map((item, i) => (
            <div
              key={item.title}
              className="group relative rounded-[var(--sk-radius)] border border-[var(--sk-line)] bg-[var(--sk-paper)] p-7 shadow-[var(--sk-shadow-card)] transition-shadow duration-300 hover:shadow-[var(--sk-shadow-card-hover)]"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[var(--sk-gold)] transition-transform duration-300 group-hover:scale-x-100"
              />
              <p className={`text-sm text-[var(--sk-gold-text)] ${display}`}>
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className={`mt-2 text-lg text-[var(--sk-ink)] ${display}`}>
                {item.title}
              </h3>
              {item.body && (
                <p className="mt-3 text-sm leading-loose text-[var(--sk-ink-soft)]">
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
  // プランカード型: 2〜4件の料金が見比べやすい（表型は件数が多いとき用）
  if (section.layout === 'plans') {
    const items = section.items ?? [];
    return (
      <section data-sk-layout="plans" className="bg-[var(--sk-paper-soft)] py-20">
        <div className={container}>
          {section.heading && <SectionHeading text={section.heading} />}
          {section.body && <SectionLead text={section.body} />}
          <div
            className={`mt-10 grid gap-6 sm:grid-cols-2 ${items.length >= 3 ? 'lg:grid-cols-3' : ''}`}
          >
            {items.map((item) => (
              <div
                key={item.title}
                className="flex flex-col rounded-[var(--sk-radius)] border border-[var(--sk-line)] bg-[var(--sk-paper)] p-8 shadow-[var(--sk-shadow-card)] transition-shadow duration-300 hover:shadow-[var(--sk-shadow-card-hover)]"
              >
                <h3 className={`text-lg text-[var(--sk-ink)] ${display}`}>{item.title}</h3>
                {item.meta && (
                  <p className={`mt-4 text-2xl text-[var(--sk-primary-strong)] ${display}`}>
                    {item.meta}
                  </p>
                )}
                <span aria-hidden className="my-5 block h-px w-8 bg-[var(--sk-gold)]" />
                {item.body && (
                  <p className="text-sm leading-loose text-[var(--sk-ink-soft)]">{item.body}</p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--sk-ink-soft)]">
            ※ 内容により変動します。正確なお見積りはお問い合わせください。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-sk-layout="table" className="bg-[var(--sk-paper-soft)] py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        {section.body && <SectionLead text={section.body} />}
        <div className="mt-10 overflow-hidden rounded-[var(--sk-radius)] border border-[var(--sk-line)] shadow-[var(--sk-shadow-card)]">
          <table className="w-full bg-[var(--sk-paper)] text-sm">
            <tbody>
              {(section.items ?? []).map((item, i) => (
                <tr
                  key={item.title}
                  className={i > 0 ? 'border-t border-[var(--sk-line)]' : ''}
                >
                  <th className="w-1/2 px-6 py-5 text-left font-medium text-[var(--sk-ink)]">
                    {item.title}
                    {item.body && (
                      <span className="mt-1 block text-xs font-normal leading-relaxed text-[var(--sk-ink-soft)]">
                        {item.body}
                      </span>
                    )}
                  </th>
                  <td
                    className={`px-6 py-5 text-right text-base text-[var(--sk-primary-strong)] ${display}`}
                  >
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

  // インタビュー型: 写真を大きく、語りを主役に（E-E-A-Tの見せ場）
  if (section.layout === 'interview' && photo) {
    return (
      <section data-sk-layout="interview" className="bg-[var(--sk-paper-soft)] py-20">
        <div className={container}>
          {section.heading && <SectionHeading text={section.heading} />}
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(240px,340px)_1fr] lg:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={`${b.representativeName ?? b.officeName} の写真`}
              loading="lazy"
              className="aspect-[3/4] w-full rounded-[var(--sk-radius)] object-cover shadow-[var(--sk-shadow-card-hover)]"
            />
            <div className="min-w-0">
              {b.representativeName && (
                <p className={`text-3xl text-[var(--sk-ink)] ${display}`}>
                  {b.representativeName}
                  <span className="ml-3 text-sm font-medium tracking-wider text-[var(--sk-ink-soft)]">
                    {b.industryLabel}
                  </span>
                </p>
              )}
              {b.certifications && (
                <p className="mt-2 text-sm text-[var(--sk-ink-soft)]">{b.certifications}</p>
              )}
              <span aria-hidden className="my-7 block h-px w-10 bg-[var(--sk-gold)]" />
              {section.body && (
                <p className="whitespace-pre-line text-[17px] leading-[2.1] text-[var(--sk-ink-soft)]">
                  {section.body}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-sk-layout="standard" className="py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div className="mt-10 grid gap-10 sm:grid-cols-[auto_1fr] sm:items-start">
          {photo && (
            <img
              src={photo}
              alt={`${b.representativeName ?? b.officeName} の写真`}
              width={176}
              height={224}
              loading="lazy"
              className="h-56 w-44 rounded-[var(--sk-radius)] object-cover shadow-md"
            />
          )}
          <div className="min-w-0">
            {b.representativeName && (
              <p className={`text-2xl text-[var(--sk-ink)] ${display}`}>
                {b.representativeName}
                <span className="ml-3 text-sm font-medium tracking-wider text-[var(--sk-ink-soft)]">
                  {b.industryLabel}
                </span>
              </p>
            )}
            {b.certifications && (
              <p className="mt-2 text-sm text-[var(--sk-ink-soft)]">
                {b.certifications}
              </p>
            )}
            <span
              aria-hidden
              className="my-6 block h-px w-10 bg-[var(--sk-gold)]"
            />
            {section.body && (
              <p className="whitespace-pre-line leading-loose text-[var(--sk-ink-soft)]">
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
  const layout = section.layout === 'cards' ? 'cards' : 'quotes';
  return (
    <section data-sk-layout={layout} className="bg-[var(--sk-paper-soft)] py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div
          className={
            layout === 'cards'
              ? 'mt-10 grid gap-6 sm:grid-cols-2'
              : 'mt-10 space-y-6'
          }
        >
          {(section.items ?? []).map((item) => (
            <figure
              key={item.title}
              className="relative rounded-[var(--sk-radius)] border border-[var(--sk-line)] bg-[var(--sk-paper)] p-7 pl-16 shadow-[var(--sk-shadow-card)]"
            >
              <span
                aria-hidden
                className={`absolute left-6 top-6 text-4xl leading-none text-[var(--sk-gold)] ${display}`}
              >
                “
              </span>
              <blockquote className="leading-loose text-[var(--sk-ink)]">
                {item.body}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 text-sm text-[var(--sk-ink-soft)]">
                <span aria-hidden className="inline-block h-px w-6 bg-[var(--sk-gold)]" />
                {item.title}
                {item.meta && <span className="text-xs">{item.meta}</span>}
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
    <section className="py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div
          className={`mt-10 grid gap-8 ${officePhoto ? 'sm:grid-cols-[1.1fr_1fr] sm:items-start' : ''}`}
        >
          {officePhoto && (
            <img
              src={officePhoto}
              alt={`${b.officeName}の外観`}
              loading="lazy"
              className="max-h-96 w-full rounded-[var(--sk-radius)] object-cover shadow-md"
            />
          )}
          <dl className="divide-y divide-[var(--sk-line)] overflow-hidden rounded-[var(--sk-radius)] border border-[var(--sk-line)] bg-[var(--sk-paper)] text-sm shadow-[var(--sk-shadow-card)]">
            {[
              ['所在地', b.address],
              ['電話', b.phone],
              ['営業時間', b.businessHours],
              ['定休日', b.closedDays],
            ].map(([label, value]) => (
              <div key={label} className="flex">
                <dt className="w-28 shrink-0 bg-[var(--sk-paper-soft)] px-5 py-4 font-medium tracking-wider text-[var(--sk-ink)]">
                  {label}
                </dt>
                <dd className="px-5 py-4 leading-relaxed text-[var(--sk-ink-soft)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {section.body && (
          <p className="mt-5 text-sm leading-loose text-[var(--sk-ink-soft)]">
            {section.body}
          </p>
        )}
      </div>
    </section>
  );
}

export function Contact({ section, config }: SectionProps) {
  return (
    <section className="relative overflow-hidden bg-[var(--sk-deep)] py-20 text-center">
      <div
        className="absolute inset-0 bg-[radial-gradient(50rem_24rem_at_50%_-20%,rgba(255,255,255,0.08),transparent)]"
        aria-hidden
      />
      <div className={`${container} relative`}>
        {section.heading && (
          <h2 className={`text-2xl text-white sm:text-3xl ${display}`}>
            <span
              aria-hidden
              className="mx-auto mb-5 block h-px w-12 bg-[var(--sk-gold)]"
            />
            {section.heading}
          </h2>
        )}
        {section.body && (
          <p className="mx-auto mt-5 max-w-xl leading-loose text-white/80">
            {section.body}
          </p>
        )}
        <div className="mt-9">
          <CtaButton config={config} light />
        </div>
        <p className="mt-5 text-sm tracking-wide text-white/70">
          お電話でのご相談　{config.business.phone}（{config.business.businessHours}）
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
    <section className="py-20">
      <div className={container}>
        <SectionHeading text={section.heading ?? 'よくある質問'} />
        <div className="mt-10 divide-y divide-[var(--sk-line)] border-y border-[var(--sk-line)]">
          {items.map((item) => (
            <details key={item.title} className="group py-5">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 font-medium text-[var(--sk-ink)]">
                <span>
                  <span className={`mr-3 text-[var(--sk-gold-text)] ${display}`}>
                    Q
                  </span>
                  {item.title}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-[var(--sk-gold-text)] transition-transform duration-200 group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <p className="mt-4 pl-8 leading-loose text-[var(--sk-ink-soft)]">
                <span className={`mr-3 text-[var(--sk-primary-strong)] ${display}`}>
                  A
                </span>
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
    <ul className="divide-y divide-[var(--sk-line)] border-y border-[var(--sk-line)]">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1 py-5 sm:flex-row sm:gap-8">
          <time className="shrink-0 pt-0.5 text-xs font-semibold tracking-[0.15em] text-[var(--sk-gold-text)] [font-variant-numeric:tabular-nums]">
            {item.publishedAt.slice(0, 10).replaceAll('-', '.')}
          </time>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--sk-ink)]">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * お知らせ系セクションの枠（静的版とライブ取得版で同じ見た目を共有するための部品）。
 * site-template の LiveNews / LiveNewsDigest もこの枠を使うこと（マークアップの二重管理を防ぐ）。
 */
export function NewsSectionShell({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-20">
      <div className={container}>
        <SectionHeading text={heading} />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function NewsDigestShell({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--sk-line)] bg-[var(--sk-paper-soft)] py-12">
      <div className={container}>
        <div className="flex items-baseline justify-between">
          <h2 className={`text-xl text-[var(--sk-ink)] ${display}`}>{heading}</h2>
          <a
            href="/news"
            className="text-sm font-medium text-[var(--sk-primary-strong)] underline-offset-4 hover:underline"
          >
            お知らせ一覧へ →
          </a>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

/**
 * トップ用お知らせダイジェスト: 最新3件＋一覧への導線。
 * site-template側ではライブ取得版（LiveNewsDigest）に差し替えられる。
 */
export function NewsDigest({ section, config }: SectionProps) {
  return (
    <NewsDigestShell heading={section.heading ?? 'お知らせ'}>
      <NewsList items={config.announcements.baked.slice(0, 3)} />
    </NewsDigestShell>
  );
}

export function News({ section, config }: SectionProps) {
  return (
    <NewsSectionShell heading={section.heading ?? 'お知らせ'}>
      <div data-sokko-news>
        <NewsList items={config.announcements.baked} />
      </div>
    </NewsSectionShell>
  );
}

export function RichText({ section }: SectionProps) {
  return (
    <section className="py-20">
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <p className="mt-8 max-w-2xl whitespace-pre-line leading-loose text-[var(--sk-ink-soft)]">
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
    <div className={center ? 'text-center' : ''}>
      <span
        aria-hidden
        className={`block h-px w-12 bg-[var(--sk-gold)] ${center ? 'mx-auto' : ''}`}
      />
      <h2
        className={`mt-5 text-2xl text-[var(--sk-ink)] sm:text-3xl ${display}`}
      >
        {text}
      </h2>
    </div>
  );
}

function SectionLead({ text }: { text: string }) {
  return (
    <p className="mt-5 max-w-2xl leading-loose text-[var(--sk-ink-soft)]">{text}</p>
  );
}

/**
 * 事例・作品ギャラリー（config.images.works から表示。buildSiteConfigが自動挿入）。
 * - heading付き（トップのダイジェスト）: 最大6枚＋事例ページへの導線
 * - headingなし（事例ページ）: 全量表示
 * 写真が無い場合は何も描画しない（写真なしデザインへの自動フォールバック）
 */
export function WorksGallery({ section, config }: SectionProps) {
  const works = config.images?.works ?? [];
  if (works.length === 0) return null;
  const isDigest = section.heading !== undefined;
  const shown = isDigest ? works.slice(0, 6) : works;
  const casesPage = config.pages.find((p) => p.key === 'cases');

  return (
    <section
      className={`py-20 ${isDigest ? 'bg-[var(--sk-paper-soft)]' : 'bg-[var(--sk-paper)]'}`}
    >
      <div className={container}>
        {section.heading && <SectionHeading text={section.heading} />}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((work, i) => (
            <figure key={`${work.src}-${i}`} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--sk-radius)] border border-[var(--sk-line)] bg-[var(--sk-paper-soft)] shadow-[var(--sk-shadow-card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={work.src}
                  alt={work.caption ?? `事例写真${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
              {work.caption && (
                <figcaption className="mt-2.5 flex items-center gap-2 text-sm text-[var(--sk-ink-soft)]">
                  <span aria-hidden className="inline-block h-px w-5 bg-[var(--sk-gold)]" />
                  {work.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        {isDigest && works.length > shown.length && casesPage && (
          <p className="mt-8 text-right">
            <a
              href={casesPage.path}
              className="text-sm font-semibold text-[var(--sk-primary-strong)] hover:underline"
            >
              {casesPage.navLabel ?? 'もっと見る'}をもっと見る →
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
