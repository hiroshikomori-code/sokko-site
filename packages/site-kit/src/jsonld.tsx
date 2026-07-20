import type { SiteConfig } from '@sokko/shared';

/**
 * AEOエンジンの核（§12）: 構造化データを全サイトに自動付与。
 * LegalService（LocalBusiness系）＋ FAQPage ＋ Person（E-E-A-T）。
 */
export function buildJsonLd(config: SiteConfig): object[] {
  const { business, meta, aeo, cta } = config;

  const legalService: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': business.schemaType ?? 'LegalService',
    '@id': `${meta.baseUrl}/#business`,
    name: business.officeName,
    alternateName: business.officeNameKana,
    description: business.description,
    url: meta.baseUrl,
    telephone: business.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressCountry: 'JP',
    },
    areaServed: business.serviceAreaCities.map((city) => ({
      '@type': 'City',
      name: city,
    })),
    openingHours: business.businessHours,
    knowsAbout: aeo.searchKeywords,
    slogan: aeo.positioningStatement,
  };
  if (business.foundedYear) legalService.foundingDate = business.foundedYear;
  if (business.gbpUrl) legalService.sameAs = [business.gbpUrl];
  if (cta.bookingToolUrl) {
    legalService.potentialAction = {
      '@type': 'ReserveAction',
      target: cta.bookingToolUrl,
    };
  }

  const graphs: object[] = [legalService];

  if (business.representativeName) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${meta.baseUrl}/#representative`,
      name: business.representativeName,
      jobTitle: business.industryLabel,
      worksFor: { '@id': `${meta.baseUrl}/#business` },
      ...(business.certifications
        ? { hasCredential: business.certifications }
        : {}),
    });
  }

  if (aeo.faq.length > 0) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: aeo.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  return graphs;
}

export function JsonLd({ config }: { config: SiteConfig }) {
  return (
    <>
      {buildJsonLd(config).map((graph, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}
