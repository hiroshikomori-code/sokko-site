import Anthropic from '@anthropic-ai/sdk';
import {
  DESIGN_VARIANTS,
  DESIGN_VARIANT_KEYS,
  type DesignVariant,
  type ProjectInputDraft,
} from '@sokko/shared';

/**
 * AIデザインコンシェルジュ（Step2）。
 * ヒアリング内容（業種・ターゲット・強み・雰囲気）から、
 * デザインバリアント＋メインカラーの組合せを根拠付きで3案提案する。
 * 提案は「試着の候補」であり、採用・確定は必ずオペレーターが行う。
 */

const MODEL = process.env.SOKKO_WORKER_MODEL ?? 'claude-sonnet-5';

export type DesignProposal = {
  variant: DesignVariant;
  mainColor: string;
  title: string;
  reason: string;
};

const FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['proposals'],
    properties: {
      proposals: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['variant', 'mainColor', 'title', 'reason'],
          properties: {
            variant: { type: 'string', enum: [...DESIGN_VARIANT_KEYS] },
            mainColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            title: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  },
};

const VARIANT_GUIDE = DESIGN_VARIANT_KEYS.map(
  (k) => `- ${k}: ${DESIGN_VARIANTS[k].label} — ${DESIGN_VARIANTS[k].description}`,
).join('\n');

const SYSTEM = `あなたはWebサイト制作会社のアートディレクターです。ヒアリング内容から、その事業に合うデザインの方向性を3案提案します。

選べるデザインバリアント（見た目のみの切替。構造・文章は共通）:
${VARIANT_GUIDE}

厳守すべきルール:
1. 必ずちょうど3案。variantは3案で重複させない（違う方向性を見比べられるように）
2. 1案目は「最有力」: 業種・ターゲットに最も堅実に合うもの。2案目は「差別化」: 競合と見た目で差がつくもの。3案目は「意外な選択肢」: 発想を広げるもの
3. mainColorは各案のバリアントと調和する濃色（白文字のボタンが載っても読める暗さ・彩度）を提案する。現在の設定色が事業に合っているなら活かしてよい
4. titleは15字以内の案名（例:「王道の信頼路線」）。reasonは60〜90字で「誰に・何を打ち出すためにこの見た目か」を具体的に
5. 誇大な表現・断定は使わない`;

export async function suggestDesign(
  input: ProjectInputDraft,
): Promise<DesignProposal[]> {
  const basics = input.basics ?? {};
  const summary = [
    `事業者名: ${basics.officeName ?? '未入力'}`,
    `業種: ${basics.industryLabel ?? basics.industryType ?? '未判定'}`,
    `業務内容: ${basics.businessSummary ?? ''}`,
    `想定客層: ${input.target?.customerProfile ?? ''}`,
    `客の悩み: ${input.target?.customerNeeds ?? ''}`,
    `強み: ${(input.strengths?.strengths ?? []).filter(Boolean).join('／')}`,
    `他社との違い: ${input.strengths?.differentiator ?? ''}`,
    `「◯◯といえば」: ${input.aeo?.positioningStatement ?? ''}`,
    `希望の雰囲気（トーン）: ${input.mood?.tone ?? '未設定'}`,
    `現在のメインカラー: ${input.mood?.mainColor ?? '未設定'}`,
    `参考サイト: ${(input.mood?.referenceUrls ?? []).join(' / ') || 'なし'}`,
  ].join('\n');

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `以下のヒアリング内容に合うデザインを3案提案してください。\n\n${summary}`,
      },
    ],
    output_config: { format: FORMAT },
  });
  const block = response.content.find((b) => b.type === 'text');
  const text =
    block && 'text' in block && typeof block.text === 'string' ? block.text : '';
  const parsed = JSON.parse(text) as { proposals: DesignProposal[] };
  return parsed.proposals.slice(0, 3);
}
