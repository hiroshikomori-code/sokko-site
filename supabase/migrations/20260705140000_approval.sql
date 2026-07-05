-- 承認記録（計画3章: 承認ゲート）。差し戻しでリセットされる
alter table public.projects
  add column approved_at timestamptz,
  add column approved_by uuid references public.users (id);
