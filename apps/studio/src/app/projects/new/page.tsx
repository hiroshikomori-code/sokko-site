'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createProject, type CreateProjectState } from './actions';

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState<
    CreateProjectState,
    FormData
  >(createProject, {});

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← 案件一覧へ戻る
      </Link>
      <h1 className="mt-4 text-xl font-bold text-neutral-900">
        新しいサイトを作る
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        まず案件名を付けてください（例: 山田税理士事務所さま）。
        次の画面からガイドに沿って入力していきます。
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-neutral-700"
          >
            案件名
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? '作成中…' : '作成してヒアリング入力へ'}
        </button>
      </form>
    </main>
  );
}
