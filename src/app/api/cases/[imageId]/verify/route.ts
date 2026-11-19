import type { NextRequest } from 'next/server';
import { verifyCaseFindings } from '@/lib/db';
import type { VerificationStatus } from '@/lib/types';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/cases/[imageId]/verify'>
) {
  try {
    const { imageId } = await ctx.params;
    const body = (await req.json()) as { verificationStatus?: VerificationStatus };
    const status = body.verificationStatus;
    if (status !== 'pending' && status !== 'verified') {
      return Response.json({ error: 'Invalid verificationStatus' }, { status: 400 });
    }

    const updated = await verifyCaseFindings(imageId, status);
    return Response.json({ findings: updated });
  } catch (err) {
    console.error('Failed to verify case:', err);
    return Response.json({ error: 'Failed to update case verification' }, { status: 500 });
  }
}
