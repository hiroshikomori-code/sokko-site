import { createHash } from 'node:crypto';

/**
 * ①入力のハッシュ。pages.input_hash / generation_jobs.input_hash に保存し、
 * 「入力が変わったのに古い生成物のまま」を機械的に検出する（計画3章）。
 */
export function inputHash(input: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
}
