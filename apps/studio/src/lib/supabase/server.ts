import { createServerClient } from '@supabase/ssr';
import { createClient as createBareClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Server Component / Server Action / Route Handler 用クライアント */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は書き込めない（proxyでセッション更新済み）
          }
        },
      },
    },
  );
}

/**
 * service role クライアント（RLSを迂回）。
 * Webhook等のシステム処理専用 — ユーザー操作の経路では使わないこと。
 */
export function createServiceClient() {
  return createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
