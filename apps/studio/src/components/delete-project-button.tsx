'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProject } from '@/app/projects/actions';

/** 案件一覧の削除ボタン（公開前の案件のみ表示される） */
export function DeleteProjectButton({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const ok = window.confirm(
      `「${name}」を削除します。\n入力内容・生成済みの文章・写真もすべて消え、元に戻せません。\nよろしいですか？`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (!result.ok) window.alert(result.error);
      else router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="shrink-0 btn-ghost-danger"
    >
      {pending ? '削除中…' : '削除'}
    </button>
  );
}
