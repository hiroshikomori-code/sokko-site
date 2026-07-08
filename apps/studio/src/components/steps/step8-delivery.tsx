import Link from 'next/link';
import type { ProjectInputDraft } from '@sokko/shared';
import { DomainSettings } from './domain-settings';

/** Step8: 納品（§9-8）。公開URL＋簡易マニュアル＋LINE更新の使い方＋独自ドメイン */
export function Step8Delivery({
  projectId,
  deployUrl,
  input,
  customDomain,
}: {
  projectId: string;
  deployUrl: string | null;
  input: ProjectInputDraft;
  customDomain: string | null;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">公開URL</h3>
        {deployUrl ? (
          <a
            href={deployUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-blue-700 underline"
          >
            {deployUrl}
          </a>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">まだ公開されていません（Step7で公開）</p>
        )}
        {customDomain && (
          <p className="mt-2 text-sm">
            独自ドメイン:{' '}
            <a
              href={`https://${customDomain}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              https://{customDomain}
            </a>
          </p>
        )}
      </section>

      <DomainSettings projectId={projectId} currentDomain={customDomain} />

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">お客様への納品案内（そのまま送れる文面）</h3>
        <div className="mt-3 whitespace-pre-line rounded-md bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700">
          {`${input.basics?.officeName ?? ''} さま

ホームページが公開されました。
URL: ${deployUrl ?? '（公開後に記載）'}

■ お知らせの更新方法（LINE）
1. ご案内するQRコードから公式LINEを友だち追加してください
2. トークにお知らせ文をそのまま送信してください（例:「8月13日〜15日は夏季休業します」）
3. 1分ほどでサイトの「お知らせ」に自動掲載されます

■ 内容の修正・ページの追加
担当までご連絡ください。`}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-bold text-neutral-900">運用メモ（社内向け）</h3>
        <p className="mt-2 text-sm text-neutral-600">
          お知らせの代理投稿・非公開化は{' '}
          <Link
            href={`/projects/${projectId}/announcements`}
            className="text-blue-700 underline"
          >
            お知らせ管理
          </Link>{' '}
          から行えます（LINE未設定のお客様はこちらで運用）。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>店主のLINEユーザーIDの登録（line_links）が完了しているか確認</li>
          <li>Googleビジネスプロフィール{input.aeo?.hasGbp ? '（登録済み）' : '（未登録 → 登録を案内）'}にサイトURLを設定</li>
          <li>公開希望時期: {input.operation?.desiredLaunchDate ?? '-'} / 承認者: {input.operation?.approverEmail ?? '-'}</li>
        </ul>
      </section>
    </div>
  );
}
