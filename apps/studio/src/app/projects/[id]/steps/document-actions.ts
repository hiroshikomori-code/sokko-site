'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import {
  extractDocumentText,
  MAX_FILE_BYTES,
} from '@/lib/document-extractor';
import { createClient } from '@/lib/supabase/server';

/**
 * クライアント提供資料の登録（Step1）。
 * ファイル本体は保存せず、抽出テキストのみ project_documents に保存する。
 * 登録した資料は「AIで下書きを作成」と Step3 の文章生成の両方で参照される。
 */

export type DocumentRow = {
  id: string;
  filename: string;
  char_count: number;
  created_at: string;
};

export type DocumentActionResult =
  | { ok: true; document: DocumentRow }
  | { ok: false; error: string };

export async function uploadProjectDocument(
  projectId: string,
  formData: FormData,
): Promise<DocumentActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'ファイルが選択されていません' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'ファイルが大きすぎます（15MBまで）' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractDocumentText(file.name, file.type, buffer);
  if ('error' in extracted) return { ok: false, error: extracted.error };

  const { data: row, error } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      filename: file.name.slice(0, 200),
      mime_type: file.type || 'application/octet-stream',
      extracted_text: extracted.text,
      char_count: extracted.text.length,
      uploaded_by: user.id,
    })
    .select('id, filename, char_count, created_at')
    .single();
  if (error || !row) return { ok: false, error: '保存に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'document_uploaded',
    detail: { filename: file.name, chars: extracted.text.length },
  });
  revalidatePath(`/projects/${projectId}/steps/1`);
  return { ok: true, document: row as DocumentRow };
}

export async function deleteProjectDocument(
  projectId: string,
  documentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', documentId)
    .eq('project_id', projectId);
  if (error) return { ok: false, error: '削除に失敗しました' };

  revalidatePath(`/projects/${projectId}/steps/1`);
  return { ok: true };
}
