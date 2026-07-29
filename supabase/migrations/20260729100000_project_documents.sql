-- クライアント提供資料（Excel/PDF/Word等）の抽出テキスト。
-- 元ファイルは保存しない（公開バケットに機密資料を置かない・テキストだけで生成には十分）。
-- Step1のAI下書きと、Step3の文章生成プロンプトの「クライアント提供資料」として使う
create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  -- 抽出テキスト（1資料あたり上限はアプリ側で50,000字に制限）
  extracted_text text not null,
  char_count integer not null,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index project_documents_project_idx on public.project_documents (project_id);

alter table public.project_documents enable row level security;
create policy staff_all on public.project_documents
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
