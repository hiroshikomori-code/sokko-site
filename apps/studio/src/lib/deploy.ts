/**
 * デプロイパイプラインの起動（計画6章）:
 * GitHub REST API で deploy-site.yml を workflow_dispatch する。
 * 完了検知はしない — Actions側がSupabaseへ書き戻し、UIはprojects行をポーリングする。
 */
export async function dispatchSiteDeploy(
  projectId: string,
  env: 'preview' | 'production',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const repo = process.env.GITHUB_REPO; // 例: "kaminova/sokko-site"
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!repo || !token) {
    return {
      ok: false,
      error:
        'デプロイ設定が未完了です（GITHUB_REPO / GITHUB_DISPATCH_TOKEN を設定してください）',
    };
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy-site.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { project_id: projectId, env },
      }),
    },
  );

  if (res.status !== 204) {
    const text = await res.text();
    return { ok: false, error: `デプロイの起動に失敗しました (${res.status}): ${text}` };
  }
  return { ok: true };
}
