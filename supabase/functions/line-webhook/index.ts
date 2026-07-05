/**
 * LINEお知らせ更新 Webhook（仕様書§14・計画7章）。
 *
 * LINE Messaging API → このEdge Function → announcements insert → サイトに数秒で反映。
 * （配信方式が「静的＋クライアント取得」のため再検証API呼び出しは不要）
 *
 * URL: /functions/v1/line-webhook?project=<projectId>
 * 必要なシークレット（supabase secrets set）:
 * - LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN（MVPは1チャネル共通。
 *   クライアントごとのチャネル分離はPhase 2でVault化）
 * - ADMIN_LINE_USER_ID（任意: 処理失敗を管理者へ通知）
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? '';
const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
const ADMIN_LINE_USER_ID = Deno.env.get('ADMIN_LINE_USER_ID') ?? '';

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

  // 友だち追加 → 登録案内（userIdを含めて担当者が登録できるように）
  if (event.type === 'follow') {
    await reply(
      replyToken,
      '友だち追加ありがとうございます。お知らせ更新のご利用には担当者による登録が必要です。担当者へご連絡ください。',
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
      'このアカウントは更新用に登録されていません。担当者にご連絡ください。',
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

  // 冪等: LINE再送は line_message_id のUNIQUE制約で弾く
  const { error } = await supabase.from('announcements').insert({
    project_id: projectId,
    body,
    source: 'line',
    line_message_id: event.message.id,
    published: true,
  });

  if (error) {
    if (error.code === '23505') {
      // 再送による重複 → 処理済みなので静かに成功扱い
      return;
    }
    throw new Error(`announcements insert failed: ${error.message}`);
  }

  await reply(
    replyToken,
    'お知らせを更新しました。数秒〜1分ほどでサイトに反映されます。',
  );
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
