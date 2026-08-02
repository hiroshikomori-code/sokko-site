'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-[#f5f6f8] to-[#f5f6f8] px-6">
      <div className="card w-full max-w-sm p-8">
        <span
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black text-white"
        >
          AI
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-900">
          AIホームページ制作ツール
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          社内アカウントでログインしてください
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700"
            >
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full input"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
            >
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full input"
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
            className="w-full btn-primary"
          >
            {pending ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  );
}
