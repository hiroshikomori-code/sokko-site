'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { INPUT_SCHEMA_VERSION } from '@sokko/shared';

export type CreateProjectState = { error?: string };

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: '案件名を入力してください' };
  if (name.length > 100) return { error: '案件名は100文字以内で入力してください' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      input: {},
      input_schema_version: INPUT_SCHEMA_VERSION,
      status: 'draft',
      current_step: 1,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: '案件の作成に失敗しました。もう一度お試しください。' };
  }

  const supabaseLog = await createClient();
  await supabaseLog.from('audit_log').insert({
    actor_id: user.id,
    project_id: data.id,
    action: 'project_created',
    detail: { name },
  });

  redirect(`/projects/${data.id}/steps/1`);
}
