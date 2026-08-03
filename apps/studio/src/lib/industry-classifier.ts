import Anthropic from '@anthropic-ai/sdk';
import {
  INDUSTRY_TYPES,
  SCHEMA_TYPE_OPTIONS,
  type IndustryProfile,
  type IndustryType,
} from '@sokko/shared';

/**
 * 業種のAI自動判定（Step1確定時）。
 * オペレーターに業種を選ばせず、業務内容の記述から
 * ①対応プリセット ②肩書き用の自然な業種ラベル ③広告規制の重い業種か を判定する。
 * プリセットに無い業種（generic）の場合はさらに、
 * ④言葉づかい一式（語り口・JSON-LD種別・ナビ/ページ表記）を動的に生成する
 * ＝コード追記なしで全業種に対応する「動的プリセット」。
 * 判定結果はStep2で確認・修正できる（壊せない設計: 黙って確定しない）。
 */

const MODEL = process.env.SOKKO_POLISH_MODEL ?? 'claude-sonnet-5';

export type IndustryJudgement = {
  presetKey: IndustryType;
  industryLabel: string;
  restricted: boolean;
  restrictedReason?: string;
  /** presetKey=generic のときの言葉づかい一式（プリセット業種では不要のためundefined） */
  profile?: IndustryProfile;
};

const PRESET_KEYS = Object.keys(INDUSTRY_TYPES) as IndustryType[];

// 構造化出力はoptional上限を避けるため全required＋「不要なら空文字」ルール
const FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'presetKey',
      'industryLabel',
      'restricted',
      'restrictedReason',
      'writerRole',
      'schemaType',
      'navServices',
      'navPricing',
      'navAbout',
      'navCases',
      'navContact',
      'pageServices',
      'pagePricing',
      'pageAbout',
      'pageCases',
      'pageContact',
    ],
    properties: {
      presetKey: { type: 'string', enum: PRESET_KEYS },
      industryLabel: { type: 'string', maxLength: 40 },
      restricted: { type: 'boolean' },
      restrictedReason: { type: 'string' },
      writerRole: { type: 'string', maxLength: 40 },
      schemaType: { type: 'string', enum: [...SCHEMA_TYPE_OPTIONS] },
      navServices: { type: 'string', maxLength: 10 },
      navPricing: { type: 'string', maxLength: 10 },
      navAbout: { type: 'string', maxLength: 10 },
      navCases: { type: 'string', maxLength: 10 },
      navContact: { type: 'string', maxLength: 10 },
      pageServices: { type: 'string', maxLength: 18 },
      pagePricing: { type: 'string', maxLength: 18 },
      pageAbout: { type: 'string', maxLength: 18 },
      pageCases: { type: 'string', maxLength: 18 },
      pageContact: { type: 'string', maxLength: 18 },
    },
  },
};

const SYSTEM = `あなたはWebサイト制作会社の業種判定担当です。事業者の情報から次を判定してください。

1. presetKey: 最も近い業種プリセット。${PRESET_KEYS.map((k) => `${k}=${INDUSTRY_TYPES[k]}`).join(' / ')}。どれにも明確に当てはまらなければ generic
2. industryLabel: サイトの肩書き（「大阪市北区の◯◯」の◯◯）に使う自然で短い業種名（例: 学習塾 / 工務店 / 税理士 / IT・システム開発）。誇張せず一般的な呼び方で
3. restricted: 広告表現の法規制が特に重い業種（医療機関・歯科・美容医療・薬機法対象の健康商品・金融商品取引・弁護士など）なら true。士業のうち税理士・社労士・行政書士は対応済みなので false。falseなら restrictedReason は空文字

さらに presetKey=generic の場合のみ、この業種専用の言葉づかいを設計する（generic以外は以下すべて空文字でよい。schemaTypeのみ常に最も近いものを選ぶ）:
4. writerRole: 文章の書き手として名乗る役割（例:「町工場（特殊ネジ製造）」「地域密着の学習塾」）。20字以内
5. schemaType: 構造化データ（JSON-LD）の@typeとして最も近いもの。事業内容が選択肢に明確に一致する場合のみ専門タイプを選び、少しでも迷えば LocalBusiness（例: 製造業・卸売・農業は LocalBusiness。GeneralContractor は建設・工務店のみ）
6. ナビ表記（nav◯◯・7字以内）とページ名（page◯◯・14字以内）: 標準表記が業種に不自然な場合のみ言い換えを提案。標準のままで良ければ空文字
   - 標準: services=サービス（業務案内）/ pricing=料金・報酬 / about=代表・事務所紹介 / cases=お客様の声 / contact=お問い合わせ
   - 例（製造業）: navServices=製品・技術, pageAbout=会社・工場紹介, navCases=導入事例
   - 誇大な言い回しは使わない

判定に迷う情報しかない場合は presetKey=generic、industryLabelは業務内容から最も無難な表現を選ぶ。`;

type RawJudgement = {
  presetKey: IndustryType;
  industryLabel: string;
  restricted: boolean;
  restrictedReason: string;
  writerRole: string;
  schemaType: string;
  navServices: string;
  navPricing: string;
  navAbout: string;
  navCases: string;
  navContact: string;
  pageServices: string;
  pagePricing: string;
  pageAbout: string;
  pageCases: string;
  pageContact: string;
};

function labelsFrom(
  entries: [string, string][],
): Record<string, string> | undefined {
  const filled = entries.filter(([, v]) => v.trim());
  if (filled.length === 0) return undefined;
  return Object.fromEntries(filled.map(([k, v]) => [k, v.trim()]));
}

/**
 * 判定を実行。API障害時はnull（呼び出し側で既存値を維持し、確定はブロックしない）
 */
export async function classifyIndustry(input: {
  officeName: string;
  businessSummary: string;
  strengths?: string[];
}): Promise<IndustryJudgement | null> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      // 実測: generic業種のフル出力で700超になることがある（不足すると途中で切れてパース失敗）
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `事業者名: ${input.officeName}\n業務内容: ${input.businessSummary}\n強み: ${(input.strengths ?? []).join(' / ')}`,
        },
      ],
      output_config: { format: FORMAT },
    });
    const block = response.content.find((b) => b.type === 'text');
    const text =
      block && 'text' in block && typeof block.text === 'string' ? block.text : '';
    const raw = JSON.parse(text) as RawJudgement;

    const presetKey = PRESET_KEYS.includes(raw.presetKey)
      ? raw.presetKey
      : 'generic';
    const industryLabel =
      raw.industryLabel?.trim() || INDUSTRY_TYPES[presetKey];

    let profile: IndustryProfile | undefined;
    if (presetKey === 'generic') {
      profile = {
        writerRole: raw.writerRole?.trim() || industryLabel,
        schemaType: (SCHEMA_TYPE_OPTIONS as readonly string[]).includes(
          raw.schemaType,
        )
          ? raw.schemaType
          : 'LocalBusiness',
        navLabels: labelsFrom([
          ['services', raw.navServices],
          ['pricing', raw.navPricing],
          ['about', raw.navAbout],
          ['cases', raw.navCases],
          ['contact', raw.navContact],
        ]),
        pageLabels: labelsFrom([
          ['services', raw.pageServices],
          ['pricing', raw.pagePricing],
          ['about', raw.pageAbout],
          ['cases', raw.pageCases],
          ['contact', raw.pageContact],
        ]),
      };
    }

    return {
      presetKey,
      industryLabel,
      restricted: raw.restricted,
      restrictedReason: raw.restrictedReason?.trim() || undefined,
      profile,
    };
  } catch (err) {
    console.error('classifyIndustry failed:', err);
    return null;
  }
}
