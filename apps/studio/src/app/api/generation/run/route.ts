import { NextResponse, type NextRequest } from 'next/server';
import { projectInputSchema } from '@sokko/shared';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { runGeneration } from '@/lib/generation/engine';
import { inputHash } from '@/lib/generation/hash';

// 1ページの生成→批評→改稿ループを1関数呼び出しで完結させる（計画4章）
export const maxDuration = 800;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { jobId } = (await request.json()) as { jobId?: string };
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // 原子的獲得（queued/failed のみ獲得できる。二重実行はここで弾かれる）
  const { data: claimed, error: claimError } = await supabase
    .rpc('claim_generation_job', { p_job_id: jobId })
    .single();

  if (claimError || !claimed) {
    return NextResponse.json(
      { error: 'ジョブを開始できません（実行中または完了済み）' },
      { status: 409 },
    );
  }

  const job = claimed as {
    id: string;
    project_id: string;
    page_key: string;
  };

  const fail = async (message: string) => {
    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
      .eq('id', job.id);
    return NextResponse.json({ error: message }, { status: 500 });
  };

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, input')
      .eq('id', job.project_id)
      .single();
    if (!project) return await fail('案件が見つかりません');

    const parsed = projectInputSchema.safeParse(project.input);
    if (!parsed.success) {
      return await fail('①入力が不完全です。ヒアリング入力を確定してください');
    }
    const input = parsed.data;
    const hash = inputHash(input);

    const heartbeat = async () => {
      await supabase
        .from('generation_jobs')
        .update({ heartbeat_at: new Date().toISOString() })
        .eq('id', job.id);
    };

    const result = await runGeneration(input, job.page_key, heartbeat);

    // pages upsert（バージョンを進め、差し戻しフラグを解除）
    const { data: existing } = await supabase
      .from('pages')
      .select('id, version')
      .eq('project_id', job.project_id)
      .eq('page_key', job.page_key)
      .maybeSingle();

    const pageRow = {
      project_id: job.project_id,
      page_key: job.page_key,
      title:
        typeof (result.content as { title?: string }).title === 'string'
          ? (result.content as { title: string }).title
          : '',
      content: result.content,
      version: (existing?.version ?? 0) + 1,
      input_hash: hash,
      needs_revision: false,
      revision_note: null,
      generated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await supabase
      .from('pages')
      .upsert(pageRow, { onConflict: 'project_id,page_key' });
    if (upsertError) return await fail(`生成結果の保存に失敗: ${upsertError.message}`);

    await supabase
      .from('generation_jobs')
      .update({
        status: 'done',
        input_hash: hash,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({
      ok: true,
      pageKey: job.page_key,
      revisions: result.revisions,
      usage: result.usage,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '生成中に不明なエラーが発生しました';
    return await fail(message);
  }
}
