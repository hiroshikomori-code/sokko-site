import Anthropic from '@anthropic-ai/sdk';
import { INDUSTRY_TYPES, type IndustryType } from '@sokko/shared';

/**
 * 業種のAI自動判定（Step1確定時）。
 * オペレーターに業種を選ばせず、業務内容の記述から
 * ①対応プリセット ②肩書き用の自然な業種ラベル ③広告規制の重い業種か を判定する。
 * 判定結果はStep2で確認・修正できる（壊せない設計: 黙って確定しない）。
 */

const MODEL = process.env.SOKKO_POLISH_MODEL ?? 'claude-sonnet-5';

export type IndustryJudgement = {
  presetKey: IndustryType;
  industryLabel: string;
  restricted: boolean;
  restrictedReason?: string;
};

const PRESET_KEYS = Object.keys(INDUSTRY_TYPES) as IndustryType[];

const FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['presetKey', 'industryLabel', 'restricted'],
    properties: {
      presetKey: { type: 'string', enum: PRESET_KEYS },
      industryLabel: { type: 'string', maxLength: 40 },
      restricted: { type: 'boolean' },
      restrictedReason: { type: 'string' },
    },
  },
};

const SYSTEM = `あなたはWebサイト制作会社の業種判定担当です。事業者の情報から次を判定してください。

1. presetKey: 最も近い業種プリセット。${PRESET_KEYS.map((k) => `${k}=${INDUSTRY_TYPES[k]}`).join(' / ')}。どれにも明確に当てはまらなければ generic
2. industryLabel: サイトの肩書き（「大阪市北区の◯◯」の◯◯）に使う自然で短い業種名（例: 学習塾 / 工務店 / 税理士 / IT・システム開発）。誇張せず一般的な呼び方で
3. restricted: 広告表現の法規制が特に重い業種（医療機関・歯科・美容医療・薬機法対象の健康商品・金融商品取引・弁護士など）なら true。士業のうち税理士・社労士・行政書士は対応済みなので false

判定に迷う情報しかない場合は presetKey=generic、industryLabelは業務内容から最も無難な表現を選ぶ。`;

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
      max_tokens: 300,
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
    const parsed = JSON.parse(text) as IndustryJudgement;
    if (!PRESET_KEYS.includes(parsed.presetKey)) parsed.presetKey = 'generic';
    if (!parsed.industryLabel?.trim()) {
      parsed.industryLabel = INDUSTRY_TYPES[parsed.presetKey];
    }
    return parsed;
  } catch (err) {
    console.error('classifyIndustry failed:', err);
    return null;
  }
}
