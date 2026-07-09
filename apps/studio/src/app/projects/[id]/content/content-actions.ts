'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  META_PAGE_KEY,
  PROHIBITED_EXPRESSIONS,
  pageContentSchema,
  siteMetaContentSchema,
} from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type SaveContentResult = { ok: true } | { ok: false; error: string };

/** クライアントから受け取るのはテキストのみ（構造・画像はサーバー側で元データから保持） */
const textPayloadSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  sections: z.array(
    z.object({
      heading: z.string().max(100).optional(),
      body: z.string().max(3000).optional(),
      items: z
        .array(
          z.object({
            title: z.string().max(200),
            body: z.string().max(2000).optional(),
            meta: z.string().max(100).optional(),
          }),
        )
        .optional(),
    }),
  ),
});

const metaPayloadSchema = z.object({
  llmsSummary: z.string().trim().min(1).max(1000),
  faq: z.array(
    z.object({
      question: z.string().trim().min(1).max(200),
      answer: z.string().trim().min(1).max(1000),
    }),
  ),
});

/** 禁止表現スキャン（§13 広告規制の堀。保存時に必ず通る） */
function findProhibited(value: unknown): string[] {
  const text = JSON.stringify(value);
  return PROHIBITED_EXPRESSIONS.filter((e) => text.includes(e));
}

/**
 * ページ文言の保存。
 * 元のcontentにテキストだけをマージする（セクション構成・型・画像は変更不可能）。
 * 反映は再公開時（Step7）。
 */
export async function savePageContent(
  projectId: string,
  pageKey: string,
  payloadJson: string,
): Promise<SaveContentResult> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: page } = await supabase
    .from('pages')
    .select('id, content, version')
    .eq('project_id', projectId)
    .eq('page_key', pageKey)
    .maybeSingle();
  if (!page) return { ok: false, error: 'ページが見つかりません' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return { ok: false, error: '入力の形式が不正です' };
  }

  let nextContent: unknown;

  if (pageKey === META_PAGE_KEY) {
    const current = siteMetaContentSchema.safeParse(page.content);
    const payload = metaPayloadSchema.safeParse(parsed);
    if (!current.success || !payload.success) {
      return { ok: false, error: '入力内容を確認してください' };
    }
    if (payload.data.faq.length !== current.data.faq.length) {
      return { ok: false, error: 'FAQの件数は変更できません（文言のみ編集可）' };
    }
    nextContent = payload.data;
  } else {
    const current = pageContentSchema.safeParse(page.content);
    const payload = textPayloadSchema.safeParse(parsed);
    if (!current.success || !payload.success) {
      return { ok: false, error: '入力内容を確認してください' };
    }
    // 構造チェック: セクション数・項目数は元と完全一致（構造は固定＝壊せない）
    if (payload.data.sections.length !== current.data.sections.length) {
      return { ok: false, error: 'セクション構成は変更できません' };
    }
    for (let i = 0; i < current.data.sections.length; i++) {
      const itemCount = current.data.sections[i].items?.length ?? 0;
      const editCount = payload.data.sections[i].items?.length ?? 0;
      if (itemCount !== editCount) {
        return { ok: false, error: '項目数は変更できません（文言のみ編集可）' };
      }
    }
    const merged = current.data.sections.map((section, i) => {
      const edit = payload.data.sections[i];
      return {
        ...section,
        heading: edit.heading?.trim() || section.heading,
        body: edit.body !== undefined ? edit.body : section.body,
        items: section.items?.map((item, j) => ({
          ...item,
          title: edit.items![j].title.trim() || item.title,
          body: edit.items![j].body,
          meta: edit.items![j].meta?.trim() || undefined,
        })),
      };
    });
    nextContent = {
      title: payload.data.title,
      description: payload.data.description,
      sections: merged,
    };
  }

  // 広告規制ガード
  const hits = findProhibited(nextContent);
  if (hits.length > 0) {
    return {
      ok: false,
      error: `広告規制上問題になりうる表現が含まれています: ${hits.join('、')}。事実ベースの表現に修正してください`,
    };
  }

  const { error } = await supabase
    .from('pages')
    .update({ content: nextContent, version: page.version + 1 })
    .eq('id', page.id);
  if (error) return { ok: false, error: '保存に失敗しました' };

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    project_id: projectId,
    action: 'content_edited',
    detail: { pageKey, version: page.version + 1 },
  });
  revalidatePath(`/projects/${projectId}/content/${pageKey}`);
  return { ok: true };
}
