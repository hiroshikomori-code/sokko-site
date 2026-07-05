-- 権限GRANT（プロジェクト作成時に「Automatically expose new tables」を
-- 無効にしているため、ロールごとに明示的に付与する。到達面が明文化される）

-- スキーマ利用
grant usage on schema public to anon, authenticated, service_role;

-- 社内ツール（authenticated）: RLSポリシー（is_staff）配下で全テーブル操作
grant select, insert, update, delete on all tables in schema public to authenticated;

-- システム処理（service_role）: RLS迂回の管理操作（seed・Webhook・CI）
grant all on all tables in schema public to service_role;

-- 生成サイト（anon）: announcements のみ（RLSで published=true に限定済み）
grant select on public.announcements to anon;

-- 今後のマイグレーションで作るテーブルにも同じ既定を適用
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
