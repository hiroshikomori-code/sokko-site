-- デザインバリアント（Step2で選択。§9-2）。見た目のみの切替で構造・文章は共通
alter table public.projects
  add column design_variant text not null default 'classic'
  check (design_variant in ('classic', 'future', 'warm'));
