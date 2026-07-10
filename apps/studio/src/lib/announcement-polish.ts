import Anthropic from '@anthropic-ai/sdk';

/**
 * お知らせ本文のAI校正（メモ書き・指示文 → 訪問者向けのビジネス文書）。
 * LINE経路（supabase/functions/line-webhook）と同じルールで校正する。
 * プロンプトを変えるときは両方を揃えること。
 */

const POLISH_MODEL = process.env.SOKKO_POLISH_MODEL ?? 'claude-sonnet-5';

const POLISH_SYSTEM = `あなたは中小事業者ホームページの「お知らせ」欄の編集担当です。店主やスタッフからの依頼文を、サイト訪問者向けのお知らせ本文に清書してください。

ルール:
- 丁寧なビジネス文体（です・ます調）で、簡潔に
- 「〜という内容でお知らせして」のような指示文は、指示部分を取り除き本文だけにする
- 依頼文にない情報を創作しない（理由・日時・営業時間などの補完はしない）
- 「明日」「来週」などの相対的な日付は、具体的な日付（例: 7月11日（土））に直す
- 全体で200字以内。見出しや記号の装飾は付けない
- 「日本一」「必ず」「絶対」などの誇大・断定表現は使わない
- 出力は清書後の本文のみ（前置き・説明・引用符なし）`;

export async function polishAnnouncementText(raw: string): Promise<string> {
  const client = new Anthropic();
  const today = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'full',
    timeZone: 'Asia/Tokyo',
  }).format(new Date());

  const response = await client.messages.create({
    model: POLISH_MODEL,
    max_tokens: 1000,
    system: POLISH_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `今日は${today}です。次の依頼文を、お知らせ本文に清書してください。\n\n${raw}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  const text =
    block && 'text' in block && typeof block.text === 'string' ? block.text : '';
  if (!text.trim()) throw new Error('校正結果が空でした');
  return text.trim().slice(0, 500);
}
