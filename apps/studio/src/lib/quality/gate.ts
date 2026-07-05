import { siteConfigSchema } from '@sokko/shared';
import { createClient } from '@/lib/supabase/server';
import { checkSite, type CheckFinding } from './checker';
import { measureSite, type PsiScore } from './psi';

/**
 * 自動品質ゲート（§12・計画5章）。
 * previewデプロイ済みのURLに対して PSI＋自前チェッカーを実行し、
 * 結果を quality_checks に保存する。公開ボタンの活性はこの結果が根拠。
 *
 * 判定（2段構え・PSIスコア揺れに幅を持たせる）:
 * - block: モバイルPerf < 80 / アクセシビリティ < 90 / blockレベルの検査項目
 * - warn:  モバイルPerf 80〜89 / warnレベルの検査項目（承認者の判断で通過可）
 */

const PERF_BLOCK = 80;
const PERF_WARN = 90;
const A11Y_BLOCK = 90;

export type QualityResult = {
  psi: PsiScore[];
  findings: CheckFinding[];
  summary: { blockers: number; warnings: number };
  measuredAt: string;
  baseUrl: string;
};

export async function runQualityGate(
  projectId: string,
): Promise<{ ok: true; passed: boolean; result: QualityResult } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, preview_url, site_config')
    .eq('id', projectId)
    .single();
  if (!project) return { ok: false, error: '案件が見つかりません' };
  if (!project.preview_url) {
    return { ok: false, error: 'プレビューが未デプロイです。先にプレビューをデプロイしてください' };
  }
  const parsedConfig = siteConfigSchema.safeParse(project.site_config);
  if (!parsedConfig.success) {
    return { ok: false, error: 'SiteConfigがありません。プレビューをデプロイし直してください' };
  }

  const baseUrl = project.preview_url.replace(/\/$/, '');

  // PSIと自前チェッカーを並行実行（ゲート全体を2〜3分に収める）
  const [psi, findings] = await Promise.all([
    measureSite(baseUrl),
    checkSite(baseUrl, parsedConfig.data),
  ]);

  const psiFindings: CheckFinding[] = [];
  for (const score of psi) {
    if (score.performance === null || score.accessibility === null) {
      psiFindings.push({
        level: 'block',
        path: score.path,
        code: 'psi_failed',
        message: `速度計測ができませんでした（${score.error ?? '不明'}）`,
      });
      continue;
    }
    if (score.performance < PERF_BLOCK) {
      psiFindings.push({
        level: 'block',
        path: score.path,
        code: 'performance_low',
        message: `表示速度スコアが基準未満です（${score.performance} < ${PERF_BLOCK}）`,
      });
    } else if (score.performance < PERF_WARN) {
      psiFindings.push({
        level: 'warn',
        path: score.path,
        code: 'performance_warn',
        message: `表示速度スコアがやや低めです（${score.performance}）`,
      });
    }
    if (score.accessibility < A11Y_BLOCK) {
      psiFindings.push({
        level: 'block',
        path: score.path,
        code: 'accessibility_low',
        message: `アクセシビリティスコアが基準未満です（${score.accessibility} < ${A11Y_BLOCK}）`,
      });
    }
  }

  const allFindings = [...psiFindings, ...findings];
  const blockers = allFindings.filter((f) => f.level === 'block').length;
  const warnings = allFindings.filter((f) => f.level === 'warn').length;
  const passed = blockers === 0;

  const result: QualityResult = {
    psi,
    findings: allFindings,
    summary: { blockers, warnings },
    measuredAt: new Date().toISOString(),
    baseUrl,
  };

  const { error } = await supabase.from('quality_checks').insert({
    project_id: projectId,
    result,
    passed,
  });
  if (error) return { ok: false, error: '結果の保存に失敗しました' };

  return { ok: true, passed, result };
}
