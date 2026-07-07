-- 写真機能（Step4 ビジュアル配置）: 画像スロットの保存先とStorageバケット

-- 画像スロット割当（bucket相対パスを保持）
-- 例: {"logo": "projects/<id>/logo.png", "hero": "...", "representative": "...", "office": "..."}
alter table public.projects
  add column visuals jsonb not null default '{}'::jsonb;

-- 公開読み取りバケット（生成サイトが直接参照する）
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 書き込みはスタッフのみ（公開バケットのため読み取りポリシーは不要）
create policy "staff_insert_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and public.is_staff());

create policy "staff_update_assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and public.is_staff());

create policy "staff_delete_assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and public.is_staff());
