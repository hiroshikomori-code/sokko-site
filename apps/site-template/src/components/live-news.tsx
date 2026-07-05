'use client';

import { useEffect, useState } from 'react';
import type { Section, SiteConfig } from '@sokko/shared';
import { NewsList, type NewsItem } from '@sokko/site-kit';

/**
 * お知らせ欄（計画6章のハイブリッド方式）:
 * 焼き込み済みスナップショットを初期表示し、Supabase anonから最新分を上書き取得。
 * 取得失敗時は焼き込みのまま（Supabase障害でもサイトは壊れない）。
 * 生成サイト内で唯一の動的部品。
 */
export function LiveNews({
  section,
  config,
}: {
  section: Section;
  config: SiteConfig;
}) {
  const { baked, supabaseUrl, supabaseAnonKey, projectId } =
    config.announcements;
  const [items, setItems] = useState<NewsItem[]>(baked);

  useEffect(() => {
    const url =
      `${supabaseUrl}/rest/v1/announcements` +
      `?project_id=eq.${projectId}&published=eq.true` +
      `&select=id,body,created_at&order=created_at.desc&limit=20`;
    fetch(url, {
      headers: { apikey: supabaseAnonKey, Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((rows: { id: string; body: string; created_at: string }[]) => {
        if (Array.isArray(rows)) {
          setItems(
            rows.map((r) => ({
              id: r.id,
              body: r.body,
              publishedAt: r.created_at,
            })),
          );
        }
      })
      .catch(() => {
        // 焼き込み済みの表示を維持
      });
  }, [supabaseUrl, supabaseAnonKey, projectId]);

  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-4xl px-5">
        <h2 className="text-2xl font-bold text-[var(--sk-ink)]">
          <span
            className="mb-2 block h-1 w-10 rounded bg-[var(--sk-primary)]"
            aria-hidden
          />
          {section.heading ?? 'お知らせ'}
        </h2>
        <div className="mt-8">
          <NewsList items={items} />
        </div>
      </div>
    </section>
  );
}
