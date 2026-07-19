import type { SiteConfig } from './site-config';

/**
 * 開発・プレビュー検証用の架空の税理士事務所SiteConfig。
 * テンプレの見た目確認と、生成パイプライン完成前のプレビュー動作確認に使う。
 * （実在の事務所ではない）
 */
export const SAMPLE_SITE_CONFIG: SiteConfig = {
  version: 1,
  meta: {
    slug: 'sample-yamada-tax',
    siteName: 'やまだ税理士事務所',
    locale: 'ja',
    baseUrl: 'https://sample-yamada-tax.example.com',
  },
  business: {
    officeName: 'やまだ税理士事務所',
    officeNameKana: 'やまだぜいりしじむしょ',
    industryLabel: '税理士',
    description:
      '大阪市北区の税理士事務所。中小企業の税務顧問と相続税申告を専門とし、北摂エリアの飲食店・小売店を中心に支援しています。',
    address: '大阪府大阪市北区梅田1-2-3 サンプルビル4F',
    phone: '06-1234-5678',
    businessHours: '平日 9:00〜18:00',
    closedDays: '土日祝',
    serviceAreaCities: ['大阪市北区', '大阪市中央区', '豊中市', '吹田市'],
    representativeName: '山田 太郎',
    certifications: '税理士（近畿税理士会所属）・中小企業診断士',
    foundedYear: '2012',
  },
  design: {
    templateId: 'shigyo-v1',
    tone: '信頼',
    primaryColor: '#1e3a5f',
    variant: 'classic',
  },
  cta: {
    primaryAction: 'consultation',
    label: '無料相談を予約する',
    phone: '06-1234-5678',
  },
  aeo: {
    positioningStatement: '北摂の飲食店の税務といえば、やまだ税理士事務所',
    searchKeywords: ['大阪 税理士 飲食店', '北摂 相続税 相談', '梅田 税務顧問'],
    llmsSummary:
      '大阪市北区の税理士事務所。中小企業（特に飲食店・小売店）の税務顧問と相続税申告が専門。初回相談無料。北摂エリア対応。',
    faq: [
      {
        question: '初回相談は無料ですか？',
        answer:
          'はい、初回のご相談（60分）は無料です。オンラインでも対応しています。',
      },
      {
        question: '顧問料の目安を教えてください。',
        answer:
          '月額2万円台からお受けしています。売上規模と訪問頻度により変わりますので、まずはお見積りをご依頼ください。',
      },
      {
        question: '飲食店の開業支援もお願いできますか？',
        answer:
          '開業届・青色申告承認申請から融資のご相談まで、開業前からサポートできます。',
      },
    ],
  },
  pages: [
    {
      key: 'home',
      path: '/',
      title: 'やまだ税理士事務所｜大阪市北区の税理士',
      description:
        '大阪市北区の税理士事務所。飲食店・小売店の税務顧問と相続税申告が専門。初回相談無料。',
      sections: [
        {
          type: 'hero',
          heading: '飲食店の経営を、数字の面から支える税理士です。',
          body: '税務顧問・記帳代行・相続税申告まで。大阪市北区・北摂エリアの中小企業を12年間支援してきました。初回相談は無料です。',
        },
        // 実案件では buildSiteConfig がhero直後に自動挿入する（サンプルは手書きで同等に）
        { type: 'news_digest', heading: 'お知らせ' },
        {
          type: 'services',
          heading: '取扱業務',
          items: [
            { title: '税務顧問', body: '月次の記帳確認から節税のご提案まで。' },
            { title: '相続税申告', body: '累計200件の申告実績があります。' },
            { title: '開業支援', body: '飲食店の開業手続きと融資相談に対応。' },
            { title: '確定申告', body: '個人事業主の申告を丸ごとサポート。' },
          ],
        },
        { type: 'faq' },
        {
          type: 'cta',
          heading: 'まずは無料相談から',
          body: 'ご相談は無料です。お気軽にお問い合わせください。',
        },
      ],
    },
    {
      key: 'services',
      path: '/services',
      title: '取扱業務｜やまだ税理士事務所',
      description: '税務顧問・相続税申告・開業支援・確定申告の詳細。',
      sections: [
        {
          type: 'services',
          heading: '取扱業務',
          body: '中小企業と個人事業主のための税務サービスを提供しています。',
          items: [
            {
              title: '税務顧問',
              body: '月次訪問またはオンラインで記帳を確認し、決算・申告まで一貫して対応します。',
            },
            {
              title: '相続税申告',
              body: '財産評価から申告書作成まで。生前対策のご相談も承ります。',
            },
          ],
        },
        {
          type: 'cta',
          heading: 'サービスについてのご相談',
          body: '貴社に合ったプランをご提案します。',
        },
      ],
    },
    {
      key: 'pricing',
      path: '/pricing',
      title: '料金の目安｜やまだ税理士事務所',
      description: '税務顧問・相続税申告・確定申告の料金目安。',
      sections: [
        {
          type: 'pricing',
          heading: '料金の目安',
          items: [
            { title: '税務顧問（法人）', body: '月次面談・決算料別', meta: '月額 30,000円〜' },
            { title: '税務顧問（個人）', body: '記帳代行込み', meta: '月額 20,000円〜' },
            { title: '相続税申告', body: '財産総額による', meta: '300,000円〜' },
            { title: '確定申告（単発）', meta: '80,000円〜' },
          ],
        },
        { type: 'cta', heading: 'お見積りは無料です' },
      ],
    },
    {
      key: 'about',
      path: '/about',
      title: '代表・事務所紹介｜やまだ税理士事務所',
      description: '代表税理士 山田太郎の経歴と事務所の紹介。',
      sections: [
        {
          type: 'profile',
          heading: '代表紹介',
          body: '大手税理士法人で10年間勤務した後、2012年に開業。飲食店オーナーだった父の影響で、飲食業の経営に数字の面から寄り添うことを使命としています。',
        },
        {
          type: 'richtext',
          heading: '事務所の方針',
          body: '「わかりやすく、早く、正直に」。専門用語を使わない説明と、質問への即日回答を心がけています。',
        },
      ],
    },
    {
      key: 'cases',
      path: '/cases',
      title: 'お客様の声｜やまだ税理士事務所',
      description: '顧問先からいただいた声をご紹介します。',
      sections: [
        {
          type: 'testimonials',
          heading: 'お客様の声',
          items: [
            {
              title: '大阪市内・イタリアン経営',
              body: '開業のときから面倒を見てもらっています。資金繰りの相談にすぐ乗ってくれるのが心強いです。',
              meta: '顧問歴8年',
            },
            {
              title: '豊中市・小売業',
              body: '前の税理士さんより説明がずっとわかりやすい。数字が苦手な私でも経営判断ができるようになりました。',
              meta: '顧問歴3年',
            },
          ],
        },
      ],
    },
    {
      key: 'access',
      path: '/access',
      title: 'アクセス｜やまだ税理士事務所',
      description: '大阪市北区梅田。各線梅田駅から徒歩5分。',
      sections: [
        {
          type: 'access',
          heading: 'アクセス',
          body: '各線「梅田駅」から徒歩5分。お車の場合は近隣のコインパーキングをご利用ください。',
        },
      ],
    },
    {
      key: 'contact',
      path: '/contact',
      title: 'お問い合わせ・相談予約｜やまだ税理士事務所',
      description: '無料相談のご予約はこちらから。',
      sections: [
        {
          type: 'contact',
          heading: 'お問い合わせ・相談予約',
          body: '初回相談（60分)は無料です。フォームまたはお電話でご連絡ください。',
        },
      ],
    },
    {
      key: 'news',
      path: '/news',
      title: 'お知らせ｜やまだ税理士事務所',
      description: '事務所からのお知らせ。',
      sections: [{ type: 'news', heading: 'お知らせ' }],
    },
  ],
  announcements: {
    baked: [
      {
        id: 'sample-1',
        body: '夏季休業のお知らせ: 8月13日〜15日は休業いたします。',
        publishedAt: '2026-07-01T09:00:00+09:00',
      },
    ],
    supabaseUrl: 'https://gpoxtnyvrjwwtcilubez.supabase.co',
    supabaseAnonKey: 'SAMPLE_ANON_KEY',
    projectId: '00000000-0000-0000-0000-000000000000',
  },
};
