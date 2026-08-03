-- デザインバリアント拡張: 3種 → 6種（minimal / editorial / craft を追加）
alter table public.projects
  drop constraint if exists projects_design_variant_check;
alter table public.projects
  add constraint projects_design_variant_check
  check (design_variant in ('classic', 'future', 'warm', 'minimal', 'editorial', 'craft'));
