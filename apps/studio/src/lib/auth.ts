import { createClient } from '@/lib/supabase/server';

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: 'operator' | 'approver';
};

/**
 * 現在のログインユーザー（users登録済みスタッフ）を返す。
 * 未ログイン・未登録は null（呼び出し側でredirect等の処理をする）。
 */
export async function getCurrentUser(): Promise<StaffUser | null> {
  const supabase = await createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // アクセストークン失効直後のレース対策: 明示リフレッシュして1回だけ再試行
  // （これが無いと、失効後最初のServer Actionが誤ってログアウト扱いになる）
  if (!user) {
    await supabase.auth.refreshSession();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  }
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', user.id)
    .single();

  return (data as StaffUser) ?? null;
}
