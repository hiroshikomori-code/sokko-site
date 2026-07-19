'use client';

import { useEffect, useState } from 'react';
import type { Section, SiteConfig } from '@sokko/shared';
import {
  NewsDigestShell,
  NewsList,
  NewsSectionShell,
  type NewsItem,
} from '@sokko/site-kit';

/**
 * お知らせ欄（計画6章のハイブリッド方式）:
 * 焼き込み済みスナップショットを初期表示し、Supabase anonから最新分を上書き取得。
 * 取得失敗時は焼き込みのまま（Supabase障害でもサイトは壊れない）。
 * 生成サイト内で唯一の動的部品。
 */
function useLiveAnnouncements(config: SiteConfig, limit: number): NewsItem[] {
  const { baked, supabaseUrl, supabaseAnonKey, projectId } =
    config.announcements;
  const [items, setItems] = useState<NewsItem[]>(baked.slice(0, limit));

  useEffect(() => {
    const url =
      `${supabaseUrl}/rest/v1/announcements` +
      `?project_id=eq.${projectId}&published=eq.true` +
      `&select=id,body,created_at&order=created_at.desc&limit=${limit}`;
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
  }, [supabaseUrl, supabaseAnonKey, projectId, limit]);

  return items;
}

export function LiveNews({
  section,
  config,
}: {
  section: Section;
  config: SiteConfig;
}) {
  const items = useLiveAnnouncements(config, 20);

  return (
    <NewsSectionShell heading={section.heading ?? 'お知らせ'}>
      <NewsList items={items} />
    </NewsSectionShell>
  );
}

/** トップ用ダイジェスト（最新3件＋一覧導線）のライブ取得版 */
export function LiveNewsDigest({
  section,
  config,
}: {
  section: Section;
  config: SiteConfig;
}) {
  const items = useLiveAnnouncements(config, 3);

  return (
    <NewsDigestShell heading={section.heading ?? 'お知らせ'}>
      <NewsList items={items} />
    </NewsDigestShell>
  );
}
