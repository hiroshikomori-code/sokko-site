import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  META_PAGE_KEY,
  PAGE_LABELS,
  pageContentSchema,
  siteMetaContentSchema,
  type PageKey,
  type ProjectInput,
} from '@sokko/shared';
import {
  criticSystemPrompt,
  critiquePrompt,
  metaPrompt,
  pagePrompt,
  revisePrompt,
  workerSystemPrompt,
} from './prompts';
import {
  CRITIQUE_FORMAT,
  PAGE_CONTENT_FORMAT,
  SITE_META_FORMAT,
} from './output-schemas';

/**
 * 生成→自己批評→改稿ループ（§11・計画4章）。
 * Sonnet 5（ワーカー）が生成し、Fable 5（司令塔）が4観点でレビュー、
 * 不合格なら改稿。ループ上限2周（コスト暴走防止）。
 */

const WORKER_MODEL = process.env.SOKKO_WORKER_MODEL ?? 'claude-sonnet-5';
const ORCHESTRATOR_MODEL =
  process.env.SOKKO_ORCHESTRATOR_MODEL ?? 'claude-fable-5';
const MAX_REVISIONS = 2;

const critiqueSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()),
});
type Critique = z.infer<typeof critiqueSchema>;

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type GenerationResult = {
  content: unknown;
  usage: TokenUsage;
  revisions: number;
};

function textOf(response: { content: { type: string }[] }): string {
  const block = response.content.find((b) => b.type === 'text');
  if (!block || !('text' in block) || typeof block.text !== 'string') {
    throw new Error('モデル応答にテキストがありません');
  }
  return block.text;
}

export async function runGeneration(
  input: ProjectInput,
  pageKey: string,
  onHeartbeat: () => Promise<void>,
  /** 差し戻しコメント（承認者の改稿指示）。あれば初稿プロンプトに織り込む（計画3.1章） */
  revisionNote?: string | null,
): Promise<GenerationResult> {
  const client = new Anthropic();
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  const isMeta = pageKey === META_PAGE_KEY;
  const schema = isMeta ? siteMetaContentSchema : pageContentSchema;
  const format = isMeta ? SITE_META_FORMAT : PAGE_CONTENT_FORMAT;
  const label = isMeta
    ? 'サイト全体メタ（llms.txt要約・FAQ）'
    : PAGE_LABELS[pageKey as PageKey];
  const basePrompt = isMeta
    ? metaPrompt(input)
    : pagePrompt(input, pageKey as Exclude<PageKey, 'news'>);
  const userPrompt = revisionNote?.trim()
    ? `${basePrompt}

## 承認者からの差し戻し指摘（最優先で反映すること）
前回の生成物はレビューで差し戻されました。以下の指摘を必ず反映してください:
${revisionNote.trim()}`
    : basePrompt;
  const system = workerSystemPrompt(input);

  const generate = async (
    messages: Anthropic.MessageParam[],
  ): Promise<unknown> => {
    const response = await client.messages.create({
      model: WORKER_MODEL,
      max_tokens: 16000,
      system,
      messages,
      output_config: { format },
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    if (response.stop_reason === 'max_tokens') {
      throw new Error('生成が長すぎて途中で切れました。再実行してください');
    }
    const parsed = schema.safeParse(JSON.parse(textOf(response)));
    if (!parsed.success) {
      throw new Error(`生成結果が契約スキーマに合いません: ${parsed.error.message}`);
    }
    return parsed.data;
  };

  // 1. ワーカー初稿
  let current = await generate([{ role: 'user', content: userPrompt }]);
  await onHeartbeat();
  let revisions = 0;

  // 2. 司令塔レビュー → 改稿ループ（上限2周）
  for (let round = 0; round < MAX_REVISIONS; round++) {
    const critique = await reviewByOrchestrator(
      client,
      input,
      label,
      JSON.stringify(current, null, 2),
      usage,
    );
    await onHeartbeat();

    if (critique.passed || critique.issues.length === 0) break;

    try {
      current = await generate([
        { role: 'user', content: userPrompt },
        {
          role: 'user',
          content: revisePrompt(
            JSON.stringify(current, null, 2),
            critique.issues,
          ),
        },
      ]);
      revisions++;
    } catch {
      break; // 改稿失敗時は前稿を採用（人間レビューゲートで捕捉）
    }
    await onHeartbeat();
  }

  return { content: current, usage, revisions };
}

/**
 * Fable 5司令塔レビュー。thinkingは常時ON（パラメータ省略）。
 * 安全分類器のrefusal対策としてserver-side fallback（Opus 4.8）を既定で有効化。
 */
async function reviewByOrchestrator(
  client: Anthropic,
  input: ProjectInput,
  pageLabel: string,
  generatedJson: string,
  usage: TokenUsage,
): Promise<Critique> {
  const response = await client.beta.messages.create({
    model: ORCHESTRATOR_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
    system: criticSystemPrompt(),
    messages: [
      { role: 'user', content: critiquePrompt(input, pageLabel, generatedJson) },
    ],
    output_config: { format: CRITIQUE_FORMAT },
  });
  usage.inputTokens += response.usage.input_tokens;
  usage.outputTokens += response.usage.output_tokens;

  if (response.stop_reason === 'refusal') {
    // フォールバック込みで拒否 → レビュー不能。人間レビューゲートに委ねて通す
    return { passed: true, issues: [] };
  }

  try {
    const parsed = critiqueSchema.safeParse(JSON.parse(textOf(response)));
    return parsed.success ? parsed.data : { passed: true, issues: [] };
  } catch {
    return { passed: true, issues: [] };
  }
}
