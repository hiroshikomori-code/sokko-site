'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  generateHeroImageForProject,
  saveVisualSlot,
  updateWorkPhotos,
} from '@/app/projects/[id]/steps/visual-actions';
import { AdvanceButton } from './advance-button';

/**
 * Step4: ビジュアル配置（§9-4）。
 * 固定スロット制（自由配置はさせない＝壊せない設計）。
 * 写真がないスロットは、テンプレ側で写真なしデザインに自動フォールバックする。
 * アップロード時にブラウザ側で縮小し、表示速度（品質ゲート）を守る。
 */

type SlotDef = {
  slot: 'logo' | 'hero' | 'representative' | 'office';
  label: string;
  hint: string;
  maxWidth: number;
};

const SLOTS: SlotDef[] = [
  {
    slot: 'logo',
    label: 'ロゴ',
    hint: 'ヘッダーに表示（PNG推奨・透過可）',
    maxWidth: 480,
  },
  {
    slot: 'hero',
    label: 'メインビジュアル（トップの背景）',
    hint: '事務所の外観・執務風景など横長の写真',
    maxWidth: 1920,
  },
  {
    slot: 'representative',
    label: '代表者の写真',
    hint: '「代表・事務所紹介」に表示（E-E-A-Tに効きます）',
    maxWidth: 800,
  },
  {
    slot: 'office',
    label: '事務所・店舗の写真',
    hint: '「アクセス」に表示（来訪時の目印になります）',
    maxWidth: 1200,
  },
];

const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/`;

/**
 * 画像をブラウザ側で縮小＋WebP変換（品質ゲートの表示速度を守る）。
 * WebPはJPEG比で3〜5割軽く、透過（ロゴ）にも対応するため全スロット共通で変換する。
 */
async function downscale(file: File, maxWidth: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  if (file.type === 'image/webp' && scale === 1 && file.size < 300_000) {
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の変換に失敗'))),
      'image/webp',
      0.8,
    ),
  );
}

type WorkPhoto = { path: string; caption?: string };

export function Step4Visual({
  projectId,
  initialVisuals,
  initialWorks,
  readOnly,
  aiImageEnabled,
}: {
  projectId: string;
  initialVisuals: Record<string, string>;
  /** 事例・作品ギャラリー（登録順） */
  initialWorks: WorkPhoto[];
  readOnly: boolean;
  /** GEMINI_API_KEY設定時のみtrue（ヒーローのAI生成ボタンを表示） */
  aiImageEnabled: boolean;
}) {
  const router = useRouter();
  const [visuals, setVisuals] = useState(initialVisuals);
  const [works, setWorks] = useState<WorkPhoto[]>(initialWorks);
  const [worksBusy, setWorksBusy] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /** 事例写真の一括アップロード（縮小→WebP→追加。1枚ずつ順に処理） */
  const onUploadWorks = async (files: FileList) => {
    setError(null);
    setWorksBusy(true);
    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const blob = await downscale(file, 1600);
        const path = `projects/${projectId}/work-${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);
        const result = await updateWorkPhotos(projectId, { kind: 'add', path });
        if (!result.ok) throw new Error(result.error);
        setWorks(result.works);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setWorksBusy(false);
    }
  };

  const onRemoveWork = async (path: string) => {
    setWorksBusy(true);
    const result = await updateWorkPhotos(projectId, { kind: 'remove', path });
    if (result.ok) {
      setWorks(result.works);
      router.refresh();
    } else setError(result.error);
    setWorksBusy(false);
  };

  const onCaptionWork = async (path: string, caption: string) => {
    const result = await updateWorkPhotos(projectId, { kind: 'caption', path, caption });
    if (result.ok) setWorks(result.works);
  };

  const onUpload = async (def: SlotDef, file: File) => {
    setError(null);
    setBusySlot(def.slot);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
      }
      const blob = await downscale(file, def.maxWidth);
      const ext =
        blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `projects/${projectId}/${def.slot}-${Date.now()}.${ext}`;

      const supabase = createClient();
      // パスはタイムスタンプ付きで常に新規（upsertはON CONFLICT照合が必要になり
      // RLS構成が複雑化するため使わない）
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);

      const result = await saveVisualSlot(projectId, def.slot, path);
      if (!result.ok) throw new Error(result.error);

      // ヒーローはモバイル用縮小版も自動生成（srcsetで配信し表示速度を守る）
      if (def.slot === 'hero') {
        const smBlob = await downscale(file, 750);
        const smPath = path.replace(/(\.\w+)$/, '-sm$1');
        const { error: smError } = await supabase.storage
          .from('assets')
          .upload(smPath, smBlob, { contentType: smBlob.type, upsert: false });
        if (!smError) await saveVisualSlot(projectId, 'hero_sm', smPath);
      }

      setVisuals((prev) => ({ ...prev, [def.slot]: path }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setBusySlot(null);
    }
  };

  /** ヒーローのAI生成: 生成結果を通常のアップロード経路（WebP変換・縮小版付き）に流す */
  const onGenerateHero = async () => {
    setError(null);
    setBusySlot('hero');
    try {
      const result = await generateHeroImageForProject(projectId);
      if (!result.ok) throw new Error(result.error);
      const blob = await (await fetch(result.dataUrl)).blob();
      const file = new File([blob], 'ai-hero.png', { type: blob.type });
      const heroDef = SLOTS.find((s) => s.slot === 'hero')!;
      await onUpload(heroDef, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像生成に失敗しました');
      setBusySlot(null);
    }
  };

  const onRemove = async (slot: string) => {
    setError(null);
    setBusySlot(slot);
    if (slot === 'hero') await saveVisualSlot(projectId, 'hero_sm', null);
    const result = await saveVisualSlot(projectId, slot, null);
    if (result.ok) {
      setVisuals((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      router.refresh();
    } else {
      setError(result.error);
    }
    setBusySlot(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-sm text-neutral-600">
        写真はなくても公開できます（写真なしのデザインに自動調整されます）。
        あるものだけアップロードしてください。
      </p>

      <ul className="card divide-y divide-neutral-200">
        {SLOTS.map((def) => {
          const path = visuals[def.slot];
          const busy = busySlot === def.slot;
          return (
            <li key={def.slot} className="flex items-center gap-4 px-5 py-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                {path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${PUBLIC_BASE}${path}`}
                    alt={def.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                    未設定
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">{def.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{def.hint}</p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    ref={(el) => {
                      inputRefs.current[def.slot] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(def, file);
                      e.target.value = '';
                    }}
                  />
                  {def.slot === 'hero' && aiImageEnabled && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onGenerateHero}
                      title="業種・デザイン・テーマカラーに合う背景をAIが生成します"
                      className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-600 hover:text-white disabled:opacity-50"
                    >
                      {busy ? '生成中…（10〜30秒）' : 'AIで生成'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRefs.current[def.slot]?.click()}
                    className="btn-secondary"
                  >
                    {busy ? '処理中…' : path ? '差し替え' : 'アップロード'}
                  </button>
                  {path && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRemove(def.slot)}
                      className="btn-ghost-danger"
                    >
                      削除
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              事例・作品の写真
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                ★ サイトの説得力を決めます
              </span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              施工事例・料理・作品など「仕事ぶりが伝わる写真」を何枚でも。トップと事例ページのギャラリーになります（2〜10枚が目安・最大24枚）
            </p>
          </div>
          {!readOnly && (
            <label
              className={`btn-secondary cursor-pointer ${worksBusy ? 'pointer-events-none opacity-50' : ''}`}
            >
              {worksBusy ? '処理中…' : '＋ 写真を追加（複数選択可）'}
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={worksBusy || readOnly}
                onChange={(e) => {
                  if (e.target.files?.length) onUploadWorks(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        {works.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w) => (
              <div key={w.path} className="rounded-xl border border-neutral-200 p-2">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${PUBLIC_BASE}${w.path}`}
                    alt={w.caption ?? '事例写真'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={w.caption ?? ''}
                    placeholder="キャプション（例: 断熱改修の施工中）"
                    maxLength={60}
                    disabled={readOnly}
                    onBlur={(e) => {
                      if ((e.target.value || '') !== (w.caption ?? '')) {
                        onCaptionWork(w.path, e.target.value);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={worksBusy}
                      onClick={() => onRemoveWork(w.path)}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <AdvanceButton
          projectId={projectId}
          fromStep={3}
          label="次へ（コンテンツ生成）"
          disabled={busySlot !== null}
        />
      </div>
    </div>
  );
}
