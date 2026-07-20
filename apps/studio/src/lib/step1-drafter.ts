import Anthropic from '@anthropic-ai/sdk';
import { CTA_TYPES, TONES } from '@sokko/shared';

/**
 * ヒアリングメモの一括AI下書き（Step1）。
 * 打ち合わせメモ・議事録を貼るだけでA〜Iの各項目の下書きを作る。
 * 方針:
 * - 事実項目（住所・電話・数字等）はメモに書かれたものだけを抽出（創作禁止）
 * - 提案項目（検索語・ポジショニング・強みの言語化）はメモから合理的に提案してよい
 * - 結果はフォームの「下書き」であり、オペレーターが確認・修正してから確定する
 */

const MODEL = process.env.SOKKO_WORKER_MODEL ?? 'claude-sonnet-5';

export type Step1DraftSuggestion = {
  basics?: {
    officeName?: string;
    officeNameKana?: string;
    businessSummary?: string;
    address?: string;
    serviceAreaText?: string;
    phone?: string;
    businessHours?: string;
    closedDays?: string;
    foundedYear?: string;
    representativeName?: string;
    existingSiteUrl?: string;
  };
  strengths?: {
    strengths?: string[];
    differentiator?: string;
    foundingStory?: string;
    achievements?: string;
    certifications?: string;
  };
  target?: {
    customerProfile?: string;
    customerNeeds?: string;
    searchKeywords?: string[];
  };
  cta?: { primaryAction?: string };
  mood?: { tone?: string; mainColor?: string };
  aeo?: {
    serviceAreaCities?: string[];
    positioningStatement?: string;
    competitors?: string[];
  };
  operation?: {
    desiredLaunchDate?: string;
    updateFrequency?: string;
    updateOwner?: string;
  };
};

// 構造化出力の制約（optionalは24個まで）を避けるため全フィールド必須にし、
// 「メモに無い項目は空文字/空配列」ルールで表現 → prune()で除去する
const str = { type: 'string' } as const;
const strArray = { type: 'array', items: { type: 'string' } } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const FORMAT = {
  type: 'json_schema' as const,
  schema: obj({
    basics: obj({
      officeName: str,
      officeNameKana: str,
      businessSummary: str,
      address: str,
      serviceAreaText: str,
      phone: str,
      businessHours: str,
      closedDays: str,
      foundedYear: str,
      representativeName: str,
      existingSiteUrl: str,
    }),
    strengths: obj({
      strengths: strArray,
      differentiator: str,
      foundingStory: str,
      achievements: str,
      certifications: str,
    }),
    target: obj({
      customerProfile: str,
      customerNeeds: str,
      searchKeywords: strArray,
    }),
    cta: obj({
      primaryAction: { type: 'string', enum: ['', ...Object.keys(CTA_TYPES)] },
    }),
    mood: obj({
      tone: { type: 'string', enum: ['', ...TONES] },
      mainColor: { type: 'string', pattern: '^(#[0-9a-fA-F]{6})?$' },
    }),
    aeo: obj({
      serviceAreaCities: strArray,
      positioningStatement: str,
      competitors: strArray,
    }),
    operation: obj({
      desiredLaunchDate: str,
      updateFrequency: str,
      updateOwner: str,
    }),
  }),
};

const SYSTEM = `あなたはWebサイト制作会社のディレクターです。お客様との打ち合わせメモから、サイト制作ヒアリングシートの下書きを作ります。

厳守すべきルール:
1. 【事実項目】事業者名・ふりがな・住所・電話番号・営業時間・定休日・開業年・代表者名・実績数字・資格は、メモに書かれている場合のみ埋める。書かれていない項目は空文字""（配列は[]）にする（推測・創作は厳禁）
2. 【提案項目】次はメモの内容から合理的に提案してよい:
   - businessSummary（業務内容の一言説明・80字以内）
   - strengths（強み3つ・各60字以内）と differentiator（同業他社との違い）
   - customerProfile / customerNeeds（想定客層と悩み）
   - searchKeywords（お客様が検索しそうな言葉。「地域 業種/サービス」形式を中心に4〜6件）
   - positioningStatement（「◯◯といえば△△」の一文）
   - serviceAreaCities（商圏の市区町村。メモの所在地・商圏の記述から）
   - tone（信頼/親しみ/高級/誠実から業種に合うもの）、mainColor（雰囲気の記述があれば）
   - primaryAction（メモから読み取れる一番してほしい行動）
3. ふりがなは事業者名がメモにあれば生成してよい（ひらがな）
4. 文体は簡潔に。メモの言い回しを活かしつつ、ヒアリングシートに収まる長さで`;

export async function draftStep1(memo: string): Promise<Step1DraftSuggestion> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `以下の打ち合わせメモから、ヒアリングシートの下書きを作成してください。\n\n## 打ち合わせメモ\n${memo}`,
      },
    ],
    output_config: { format: FORMAT },
  });
  const block = response.content.find((b) => b.type === 'text');
  const text =
    block && 'text' in block && typeof block.text === 'string' ? block.text : '';
  return prune(JSON.parse(text)) as Step1DraftSuggestion;
}

/** 空文字・空配列・空オブジェクトを再帰的に除去（「メモに無い項目」の表現） */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.filter((v) => typeof v !== 'string' || v.trim() !== '');
    return arr.length > 0 ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const p = prune(v);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  return value;
}
