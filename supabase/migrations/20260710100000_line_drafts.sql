-- LINEお知らせの確認待ち下書き（§14拡張: 送信 → AI校正 → 店主が「OK」 → 掲載）。
-- 「OK」が返ってくるまでサイトには出ない。ユーザー×案件で常に最新1件のみ保持する
create table public.line_drafts (
  project_id uuid not null references public.projects(id) on delete cascade,
  line_user_id text not null,
  body text not null,
  -- 下書きの元になったLINEメッセージID（再送イベントの二重校正防止）
  line_message_id text,
  created_at timestamptz not null default now(),
  primary key (project_id, line_user_id)
);

alter table public.line_drafts enable row level security;
create policy staff_all on public.line_drafts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
