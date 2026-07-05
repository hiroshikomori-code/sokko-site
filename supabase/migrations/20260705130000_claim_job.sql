-- 生成ジョブの原子的獲得（計画4章: 二重実行防止）
-- UPDATE ... WHERE status IN (...) RETURNING の1文でPostgresの原子性に乗る。
-- RLS配下で実行される（security invoker）ためスタッフのみ呼び出せる。
create or replace function public.claim_generation_job(p_job_id uuid)
returns setof public.generation_jobs
language sql
as $$
  update public.generation_jobs
  set status = 'running',
      attempt = attempt + 1,
      heartbeat_at = now(),
      error = null
  where id = p_job_id
    and status in ('queued', 'failed')
  returning *;
$$;
