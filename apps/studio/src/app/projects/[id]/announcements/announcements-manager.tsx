'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  polishAnnouncement,
  postAnnouncement,
  toggleAnnouncement,
  updateAnnouncement,
} from './actions';

type Announcement = {
  id: string;
  body: string;
  source: 'line' | 'studio';
  published: boolean;
  created_at: string;
};

export function AnnouncementsManager({
  projectId,
  announcements,
}: {
  projectId: string;
  announcements: Announcement[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [draft, setDraft] = useState('');
  const [polished, setPolished] = useState(false);

  const onPost = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await postAnnouncement(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setDraft('');
      setPolished(false);
      setNotice('投稿しました。数秒〜1分ほどでサイトに反映されます');
      router.refresh();
    });
  };

  const onPolish = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await polishAnnouncement(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.body);
      setPolished(true);
      setNotice('AIが校正しました。内容を確認・手直しのうえ「投稿する」を押してください');
    });
  };

  const onSaveEdit = (id: string) => {
    startTransition(async () => {
      setError(null);
      const result = await updateAnnouncement(projectId, id, editBody);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setNotice('更新しました。数秒〜1分ほどでサイトに反映されます');
      router.refresh();
    });
  };

  const onToggle = (id: string, published: boolean) => {
    startTransition(async () => {
      setError(null);
      const result = await toggleAnnouncement(projectId, id, published);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <p
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {error ?? notice}
        </p>
      )}

      <form ref={formRef} action={onPost} className="rounded-xl border border-neutral-200 bg-white p-5">
        <label htmlFor="body" className="text-sm font-medium text-neutral-900">
          新しいお知らせ
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={500}
          required
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setPolished(false);
          }}
          placeholder="例: 明日は台風のため臨時休業（メモ書きでOK。「AIで校正」が訪問者向けの文面に清書します）"
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            投稿すると数秒〜1分でサイトのお知らせ欄に反映されます（500字まで）
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={pending || !draft.trim() || polished}
              onClick={onPolish}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              {pending ? '処理中…' : polished ? '校正済み' : 'AIで校正'}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {pending ? '投稿中…' : '投稿する'}
            </button>
          </div>
        </div>
      </form>

      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {announcements.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              {editingId === a.id ? (
                <div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onSaveEdit(a.id)}
                      className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-neutral-300 px-4 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className={`whitespace-pre-line text-sm ${a.published ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}
                  >
                    {a.body}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(a.created_at).toLocaleString('ja-JP')}
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        a.source === 'line'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {a.source === 'line' ? 'LINE' : '管理画面'}
                    </span>
                    {!a.published && (
                      <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                        非公開
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
            {editingId !== a.id && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setEditingId(a.id);
                    setEditBody(a.body);
                  }}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                >
                  編集
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onToggle(a.id, !a.published)}
                  className={`rounded-md border px-3 py-1.5 text-xs disabled:opacity-50 ${
                    a.published
                      ? 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {a.published ? '非公開にする' : '公開に戻す'}
                </button>
              </div>
            )}
          </li>
        ))}
        {announcements.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-neutral-500">
            まだお知らせがありません
          </li>
        )}
      </ul>
    </div>
  );
}
