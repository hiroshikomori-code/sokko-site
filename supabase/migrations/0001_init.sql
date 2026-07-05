-- ソッコーサイト 初期スキーマ（計画2章・仕様書§15）
-- 9テーブル: users / projects / templates / pages / announcements /
--            line_links / generation_jobs / quality_checks / audit_log

-- ============================================================
-- ヘルパー: 社内スタッフ（users登録済みの認証ユーザー）判定
-- ============================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid());
$$;

-- ============================================================
-- users: operator / approver（Supabase Authと1:1）
-- ============================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('operator', 'approver')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- templates: 業種テンプレ（MVPは士業1行）
-- ============================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  industry text not null,
  name text not null,
  design_tokens jsonb not null default '{}'::jsonb,
  default_pages jsonb not null default '[]'::jsonb,
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- projects: 1案件 = 1サイト
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique check (slug ~ '^[a-z0-9-]+$'),
  input jsonb not null default '{}'::jsonb,
  input_schema_version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'revising', 'review', 'published')),
  current_step int not null default 1 check (current_step between 1 and 8),
  template_id uuid references public.templates (id),
  preview_url text,
  deploy_url text,
  approver_id uuid references public.users (id),
  line_channel_id text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- pages: 生成コンテンツ（ページ単位。再生成・差し戻しの単位）
-- ============================================================
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  page_key text not null,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  version int not null default 0,
  input_hash text,
  needs_revision boolean not null default false,
  revision_note text,
  generated_at timestamptz,
  unique (project_id, page_key)
);

-- ============================================================
-- announcements: お知らせ（LINE/管理画面から追記）
-- ============================================================
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  body text not null,
  source text not null check (source in ('line', 'studio')),
  line_message_id text unique,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index announcements_project_published_idx
  on public.announcements (project_id, created_at desc)
  where published = true;

-- ============================================================
-- line_links: project ↔ 許可LINEユーザーID
-- ============================================================
create table public.line_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  line_user_id text not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (project_id, line_user_id)
);

-- ============================================================
-- generation_jobs: ページ単位の生成ジョブ（トークン数がcost_ledgerの布石）
-- ============================================================
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  page_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  attempt int not null default 0,
  heartbeat_at timestamptz,
  input_hash text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index generation_jobs_project_idx on public.generation_jobs (project_id, created_at desc);

-- ============================================================
-- quality_checks: 自動品質ゲートの結果（公開ボタン活性の根拠）
-- ============================================================
create table public.quality_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  result jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  checked_at timestamptz not null default now()
);

create index quality_checks_project_idx on public.quality_checks (project_id, checked_at desc);

-- ============================================================
-- audit_log: 誰がいつ何をしたか（ガバナンス）
-- ============================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id),
  project_id uuid references public.projects (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_project_idx on public.audit_log (project_id, created_at desc);

-- ============================================================
-- updated_at 自動更新
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS（計画2章: シンプル2面）
--   社内テーブル: users登録済みの認証ユーザーのみ全行アクセス可
--   announcements のみ anon に published=true のSELECTを許可
-- ============================================================
alter table public.users enable row level security;
alter table public.templates enable row level security;
alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.announcements enable row level security;
alter table public.line_links enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.quality_checks enable row level security;
alter table public.audit_log enable row level security;

create policy staff_all on public.users
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.templates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.projects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.pages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.line_links
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.generation_jobs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.quality_checks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.audit_log
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 生成サイトのお知らせ欄: anonは公開済みお知らせのみ読める（到達面をこの1点に限定）
create policy anon_read_published on public.announcements
  for select to anon using (published = true);
