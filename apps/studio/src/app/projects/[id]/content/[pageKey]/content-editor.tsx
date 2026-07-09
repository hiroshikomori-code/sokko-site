'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PageContent, SiteMetaContent } from '@sokko/shared';
import { savePageContent } from '../content-actions';

const SECTION_LABELS: Record<string, string> = {
  hero: 'メインビジュアルの文言',
  services: '業務内容',
  pricing: '料金表',
  profile: '代表紹介',
  testimonials: 'お客様の声・事例',
  access: 'アクセス案内',
  contact: 'お問い合わせ案内',
  faq: 'よくある質問（共通FAQを表示）',
  news: 'お知らせ欄',
  news_digest: 'お知らせダイジェスト',
  richtext: '自由文',
  cta: '行動喚起（CTA）',
};

const inputCls =
  'mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none';

export function ContentEditor({
  projectId,
  pageKey,
  initial,
  isMeta,
}: {
  projectId: string;
  pageKey: string;
  initial: PageContent | SiteMetaContent;
  isMeta: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // JSONをそのままフォーム状態として持ち、テキストフィールドだけ書き換える
  const [draft, setDraft] = useState(() => structuredClone(initial));

  const onSave = () => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const payload = isMeta
        ? draft
        : {
            title: (draft as PageContent).title,
            description: (draft as PageContent).description,
            sections: (draft as PageContent).sections.map((s) => ({
              heading: s.heading,
              body: s.body,
              items: s.items?.map((i) => ({
                title: i.title,
                body: i.body,
                meta: i.meta,
              })),
            })),
          };
      const result = await savePageContent(
        projectId,
        pageKey,
        JSON.stringify(payload),
      );
      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setNotice('保存しました。反映するにはStep7から再公開してください');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      router.refresh();
    });
  };

  const setPage = (patch: Partial<PageContent>) =>
    setDraft((d) => ({ ...(d as PageContent), ...patch }));

  const setSection = (i: number, patch: object) =>
    setDraft((d) => {
      const page = structuredClone(d as PageContent);
      page.sections[i] = { ...page.sections[i], ...patch };
      return page;
    });

  const setItem = (i: number, j: number, patch: object) =>
    setDraft((d) => {
      const page = structuredClone(d as PageContent);
      page.sections[i].items![j] = { ...page.sections[i].items![j], ...patch };
      return page;
    });

  const setMeta = (patch: Partial<SiteMetaContent>) =>
    setDraft((d) => ({ ...(d as SiteMetaContent), ...patch }));

  const setFaq = (i: number, patch: object) =>
    setDraft((d) => {
      const meta = structuredClone(d as SiteMetaContent);
      meta.faq[i] = { ...meta.faq[i], ...patch };
      return meta;
    });

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

      {isMeta ? (
        <MetaForm
          meta={draft as SiteMetaContent}
          setMeta={setMeta}
          setFaq={setFaq}
        />
      ) : (
        <PageForm
          page={draft as PageContent}
          setPage={setPage}
          setSection={setSection}
          setItem={setItem}
        />
      )}

      <div className="sticky bottom-0 flex justify-end border-t border-neutral-200 bg-neutral-50/95 py-4 backdrop-blur">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? '保存中…' : '保存する'}
        </button>
      </div>
    </div>
  );
}

function PageForm({
  page,
  setPage,
  setSection,
  setItem,
}: {
  page: PageContent;
  setPage: (p: Partial<PageContent>) => void;
  setSection: (i: number, p: object) => void;
  setItem: (i: number, j: number, p: object) => void;
}) {
  return (
    <>
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-bold text-neutral-900">検索結果での見え方（SEO）</h3>
        <label className="mt-3 block text-xs font-medium text-neutral-600">
          ページタイトル
          <input
            className={inputCls}
            value={page.title}
            onChange={(e) => setPage({ title: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-neutral-600">
          説明文（メタディスクリプション）
          <textarea
            rows={2}
            className={inputCls}
            value={page.description}
            onChange={(e) => setPage({ description: e.target.value })}
          />
        </label>
      </section>

      {page.sections.map((section, i) => (
        <section key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-bold text-neutral-900">
            {SECTION_LABELS[section.type] ?? section.type}
          </h3>
          {section.type === 'faq' || section.type === 'news' || section.type === 'news_digest' ? (
            <p className="mt-2 text-xs text-neutral-500">
              このセクションの中身は自動挿入のため、ここでは編集できません
              {section.type === 'faq' && '（FAQの文言は「FAQ・AI向けサイト要約」から編集）'}
            </p>
          ) : (
            <>
              {section.heading !== undefined && (
                <label className="mt-3 block text-xs font-medium text-neutral-600">
                  見出し
                  <input
                    className={inputCls}
                    value={section.heading ?? ''}
                    onChange={(e) => setSection(i, { heading: e.target.value })}
                  />
                </label>
              )}
              {section.body !== undefined && (
                <label className="mt-3 block text-xs font-medium text-neutral-600">
                  本文
                  <textarea
                    rows={4}
                    className={inputCls}
                    value={section.body ?? ''}
                    onChange={(e) => setSection(i, { body: e.target.value })}
                  />
                </label>
              )}
              {section.items?.map((item, j) => (
                <div
                  key={j}
                  className="mt-3 rounded-md border border-neutral-100 bg-neutral-50 p-3"
                >
                  <label className="block text-xs font-medium text-neutral-600">
                    項目{j + 1}: タイトル
                    <input
                      className={inputCls}
                      value={item.title}
                      onChange={(e) => setItem(i, j, { title: e.target.value })}
                    />
                  </label>
                  {item.body !== undefined && (
                    <label className="mt-2 block text-xs font-medium text-neutral-600">
                      説明
                      <textarea
                        rows={2}
                        className={inputCls}
                        value={item.body ?? ''}
                        onChange={(e) => setItem(i, j, { body: e.target.value })}
                      />
                    </label>
                  )}
                  {item.meta !== undefined && (
                    <label className="mt-2 block text-xs font-medium text-neutral-600">
                      補足（価格・肩書など）
                      <input
                        className={inputCls}
                        value={item.meta ?? ''}
                        onChange={(e) => setItem(i, j, { meta: e.target.value })}
                      />
                    </label>
                  )}
                </div>
              ))}
            </>
          )}
        </section>
      ))}
    </>
  );
}

function MetaForm({
  meta,
  setMeta,
  setFaq,
}: {
  meta: SiteMetaContent;
  setMeta: (p: Partial<SiteMetaContent>) => void;
  setFaq: (i: number, p: object) => void;
}) {
  return (
    <>
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-bold text-neutral-900">
          AI向けサイト要約（llms.txt）
        </h3>
        <textarea
          rows={3}
          className={inputCls}
          value={meta.llmsSummary}
          onChange={(e) => setMeta({ llmsSummary: e.target.value })}
        />
      </section>
      {meta.faq.map((f, i) => (
        <section key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-bold text-neutral-900">FAQ {i + 1}</h3>
          <label className="mt-3 block text-xs font-medium text-neutral-600">
            質問
            <input
              className={inputCls}
              value={f.question}
              onChange={(e) => setFaq(i, { question: e.target.value })}
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-neutral-600">
            回答
            <textarea
              rows={3}
              className={inputCls}
              value={f.answer}
              onChange={(e) => setFaq(i, { answer: e.target.value })}
            />
          </label>
        </section>
      ))}
    </>
  );
}
