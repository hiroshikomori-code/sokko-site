-- 独自ドメイン（本番公開用）。設定時、次回の本番デプロイでWorkerに接続される
alter table public.projects
  add column custom_domain text
  check (custom_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$');
