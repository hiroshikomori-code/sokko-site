'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type DomainResult = { ok: true } | { ok: false; error: string };

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * 独自ドメインの設定（nullで解除）。
 * 適用は次回の本番公開時（deploy-site.ymlがWorkerのカスタムドメインとして接続）。
 * 前提: そのドメインがCloudflareアカウントにゾーン追加済みであること。
 */
export async function setCustomDomain(
  projectId: string,
  formData: FormData,
): Promise<DomainResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const raw = String(formData.get('domain') ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  const domain = raw === '' ? null : raw;
  if (domain !== null && !DOMAIN_PATTERN.test(domain)) {
    return {
      ok: false,
      error: 'ドメインの形式が正しくありません（例: suzuki-sr.jp / www.suzuki-sr.jp）',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ custom_domain: domain })
    .eq('id', projectId);
  if (error) return { ok: false, error: '保存に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: domain ? 'custom_domain_set' : 'custom_domain_cleared',
    detail: { domain },
  });
  revalidatePath(`/projects/${projectId}/steps/8`);
  return { ok: true };
}
