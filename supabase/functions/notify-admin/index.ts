/**
 * 管理者LINE通知（観測性の最小構成・Part V-3）。
 * GitHub Actions（デプロイ失敗時）等のシステム経路から呼ばれ、
 * ADMIN_LINE_USER_ID へLINEプッシュを1本送る。
 *
 * 認可: service_role のJWTのみ受け付ける（ゲートウェイの署名検証＋role検査の二段）。
 * 必要なシークレット: LINE_CHANNEL_ACCESS_TOKEN / ADMIN_LINE_USER_ID
 */
const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
const ADMIN_LINE_USER_ID = Deno.env.get('ADMIN_LINE_USER_ID') ?? '';

function jwtRole(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).role ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('ok', { status: 200 });

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
  if (jwtRole(token) !== 'service_role') {
    return new Response('forbidden', { status: 403 });
  }

  let text = '';
  try {
    text = String(((await request.json()) as { text?: string }).text ?? '').slice(0, 1000);
  } catch {
    return new Response('invalid body', { status: 400 });
  }
  if (!text) return new Response('empty text', { status: 400 });

  if (!CHANNEL_ACCESS_TOKEN || !ADMIN_LINE_USER_ID) {
    console.warn('notify-admin: LINE secrets not configured, skipping');
    return new Response('skipped', { status: 200 });
  }

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: ADMIN_LINE_USER_ID,
      messages: [{ type: 'text', text }],
    }),
  });
  return new Response(res.ok ? 'sent' : 'line api error', {
    status: res.ok ? 200 : 502,
  });
});
