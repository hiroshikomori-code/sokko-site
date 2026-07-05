import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runQualityGate } from '@/lib/quality/gate';

// PSI計測は1URLあたり30〜60秒かかるため延長（並列計測で全体2〜3分）
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { projectId } = (await request.json()) as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const result = await runQualityGate(projectId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
