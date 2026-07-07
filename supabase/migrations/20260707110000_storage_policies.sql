-- 写真機能ストレージポリシー整備:
-- upsert（ON CONFLICT）はSELECTポリシーが無いとRLS違反になるため、SELECTを追加し
-- 全操作をスタッフ限定で明示する（デバッグ中に緩めたINSERTポリシーの復元含む）

drop policy if exists "staff_insert_assets" on storage.objects;
drop policy if exists "staff_update_assets" on storage.objects;
drop policy if exists "staff_delete_assets" on storage.objects;

create policy "staff_select_assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'assets' and public.is_staff());

create policy "staff_insert_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and public.is_staff());

create policy "staff_update_assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and public.is_staff())
  with check (bucket_id = 'assets' and public.is_staff());

create policy "staff_delete_assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and public.is_staff());
