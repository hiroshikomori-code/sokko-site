/**
 * LINEお知らせ更新 Webhook（仕様書§14・計画7章）。
 *
 * 店主のLINE送信 → AIが本文をビジネス文書に校正 → 校正案をLINEで返信 →
 * 店主が「OK」と返信 → announcements insert → サイトに数秒で反映。
 * 「OK」が来るまでは line_drafts に保留され、サイトには一切出ない。
 * （配信方式が「静的＋クライアント取得」のため再検証API呼び出しは不要）
 *
 * URL: /functions/v1/line-webhook?project=<projectId>
 * 必要なシークレット（supabase secrets set）:
 * - LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN（MVPは1チャネル共通。
 *   クライアントごとのチャネル分離はPhase 2でVault化）
 * - ANTHROPIC_API_KEY（本文の校正。失敗時は原文のまま確認フローへ）
 * - ADMIN_LINE_USER_ID（任意: 処理失敗を管理者へ通知）
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? '';
const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
const ADMIN_LINE_USER_ID = Deno.env.get('ADMIN_LINE_USER_ID') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const POLISH_MODEL = Deno.env.get('SOKKO_POLISH_MODEL') ?? 'claude-sonnet-5';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id: string; type: string; text?: string };
  deliveryContext?: { isRedelivery?: boolean };
};

// NFKC正規化＋小文字化した上で照合（「ＯＫ」「ok」等のゆらぎを吸収）
const CONFIRM_WORDS = new Set(['ok', 'はい', 'おっけー', 'オッケー', '公開', '掲載']);
const CANCEL_WORDS = new Set(['キャンセル', 'やめる', 'やめて', '中止', '取消', '取り消し']);

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('ok', { status: 200 });
  }

  const projectId = new URL(request.url).searchParams.get('project');
  if (!projectId) return new Response('missing project', { status: 400 });

  // 署名検証はJSONパース前の生ボディに対して行う（計画7章）
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';
  if (!(await verifySignature(rawBody, signature))) {
    return new Response('invalid signature', { status: 403 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(rawBody) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return new Response('invalid body', { status: 400 });
  }

  // LINEはタイムアウトで再送してくるため、処理は軽く保ち即時200を返す
  for (const event of events) {
    try {
      await handleEvent(projectId, event);
    } catch (err) {
      console.error('line-webhook error:', err);
      await notifyAdmin(
        `ソッコーサイト: LINE更新の処理に失敗しました（project=${projectId}）\n${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return new Response('ok', { status: 200 });
});

async function handleEvent(projectId: string, event: LineEvent): Promise<void> {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  // 友だち追加 → 登録案内（userIdを提示して担当者がline_linksに登録できるように）
  if (event.type === 'follow') {
    await reply(
      replyToken,
      `友だち追加ありがとうございます。お知らせ更新のご利用には担当者による登録が必要です。\n\nお手数ですが、次の「登録用ID」を担当者へお伝えください。\n登録用ID: ${userId ?? '取得できませんでした'}`,
    );
    return;
  }

  if (event.type !== 'message' || !userId) return;

  // 許可ユーザー照合（黙殺しない: 店主が「壊れた」と誤解しないよう必ず返信）
  const { data: link } = await supabase
    .from('line_links')
    .select('id')
    .eq('project_id', projectId)
    .eq('line_user_id', userId)
    .maybeSingle();
  if (!link) {
    await reply(
      replyToken,
      `このアカウントは更新用に登録されていません。\n\n次の「登録用ID」を担当者へお伝えください。\n登録用ID: ${userId}`,
    );
    return;
  }

  // MVPはテキストのみ（§14）
  if (event.message?.type !== 'text' || !event.message.text) {
    await reply(replyToken, '現在はテキストのお知らせのみ対応しています。');
    return;
  }

  // 正規化: 制御文字除去（改行は残す）＋500字上限
  const body = event.message.text
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 500);
  if (!body) {
    await reply(replyToken, 'お知らせの本文が空のようです。もう一度お送りください。');
    return;
  }

  const keyword = body.normalize('NFKC').toLowerCase();
  if (CONFIRM_WORDS.has(keyword)) {
    await publishDraft(projectId, userId, event.message.id, replyToken);
    return;
  }
  if (CANCEL_WORDS.has(keyword)) {
    await supabase
      .from('line_drafts')
      .delete()
      .eq('project_id', projectId)
      .eq('line_user_id', userId);
    await reply(
      replyToken,
      '掲載を取りやめました。掲載したい内容ができましたら、またお送りください。',
    );
    return;
  }

  // それ以外は新しいお知らせの依頼文 → 校正して確認待ち下書きに
  await createDraft(projectId, userId, event.message.id, body, replyToken, event);
}

/** 依頼文をAIで校正し、確認待ち下書きとして保存（上書き）→ 校正案を返信 */
async function createDraft(
  projectId: string,
  userId: string,
  messageId: string,
  body: string,
  replyToken: string | undefined,
  event: LineEvent,
): Promise<void> {
  // LINE再送イベントで同じメッセージを二重に校正しない
  if (event.deliveryContext?.isRedelivery) {
    const { data: existing } = await supabase
      .from('line_drafts')
      .select('line_message_id')
      .eq('project_id', projectId)
      .eq('line_user_id', userId)
      .maybeSingle();
    if (existing?.line_message_id === messageId) return;
  }

  const polished = await polish(body);
  const draftBody = (polished ?? body).slice(0, 500);

  const { error } = await supabase.from('line_drafts').upsert(
    {
      project_id: projectId,
      line_user_id: userId,
      body: draftBody,
      line_message_id: messageId,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,line_user_id' },
  );
  if (error) throw new Error(`line_drafts upsert failed: ${error.message}`);

  const note = polished === null ? '\n※自動校正が利用できなかったため原文のままです。' : '';
  await reply(
    replyToken,
    `以下の内容でサイトに掲載します。${note}\n────────\n${draftBody}\n────────\nよろしければ「OK」と返信してください。\n\n文面を変えたいときは、修正した内容をもう一度お送りください（新しい文面を作り直します）。\n掲載をやめるときは「キャンセル」と返信してください。`,
  );
}

/** 確認待ち下書きを掲載（「OK」返信時） */
async function publishDraft(
  projectId: string,
  userId: string,
  messageId: string,
  replyToken: string | undefined,
): Promise<void> {
  const { data: draft } = await supabase
    .from('line_drafts')
    .select('body')
    .eq('project_id', projectId)
    .eq('line_user_id', userId)
    .maybeSingle();
  if (!draft) {
    await reply(
      replyToken,
      '確認待ちのお知らせがありません。掲載したい内容をお送りください。',
    );
    return;
  }

  // 冪等: LINE再送は line_message_id のUNIQUE制約で弾く
  const { error } = await supabase.from('announcements').insert({
    project_id: projectId,
    body: draft.body,
    source: 'line',
    line_message_id: messageId,
    published: true,
  });
  if (error) {
    if (error.code === '23505') {
      // 再送による重複 → 処理済みなので静かに成功扱い
      return;
    }
    throw new Error(`announcements insert failed: ${error.message}`);
  }

  await supabase
    .from('line_drafts')
    .delete()
    .eq('project_id', projectId)
    .eq('line_user_id', userId);

  await reply(
    replyToken,
    'お知らせを掲載しました。数秒〜1分ほどでサイトに反映されます。',
  );
}

// studio側（apps/studio/src/lib/announcement-polish.ts）と文言を揃えること
const POLISH_SYSTEM = `あなたは中小事業者ホームページの「お知らせ」欄の編集担当です。店主やスタッフからの依頼文を、サイト訪問者向けのお知らせ本文に清書してください。

ルール:
- 丁寧なビジネス文体（です・ます調）で、簡潔に
- 「〜という内容でお知らせして」のような指示文は、指示部分を取り除き本文だけにする
- 依頼文にない情報を創作しない（理由・日時・営業時間などの補完はしない）
- 「明日」「来週」などの相対的な日付は、具体的な日付（例: 7月11日（土））に直す
- 全体で200字以内。見出しや記号の装飾は付けない
- 「日本一」「必ず」「絶対」などの誇大・断定表現は使わない
- 出力は清書後の本文のみ（前置き・説明・引用符なし）`;

/** 依頼文をお知らせ本文に校正。失敗時はnull（原文のまま確認フローへ流す） */
async function polish(raw: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const today = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'full',
    timeZone: 'Asia/Tokyo',
  }).format(new Date());
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: POLISH_MODEL,
        max_tokens: 1000,
        system: POLISH_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `今日は${today}です。次の依頼文を、お知らせ本文に清書してください。\n\n${raw}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`anthropic api ${res.status}`);
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((b) => b.type === 'text')?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error('polish failed:', err);
    return null;
  }
}

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!CHANNEL_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function reply(replyToken: string | undefined, text: string): Promise<void> {
  if (!replyToken || !CHANNEL_ACCESS_TOKEN) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

/** 観測性の最小先取り（Part V-3）: 処理失敗を管理者LINEへ1本通知 */
async function notifyAdmin(text: string): Promise<void> {
  if (!ADMIN_LINE_USER_ID || !CHANNEL_ACCESS_TOKEN) return;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: ADMIN_LINE_USER_ID,
      messages: [{ type: 'text', text }],
    }),
  }).catch(() => {});
}
