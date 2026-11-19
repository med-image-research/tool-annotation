import type { NextRequest } from 'next/server';
import { updateFinding } from '@/lib/db';
import type { BoundingBox, VerificationStatus } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/findings/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      boxes?: BoundingBox[];
      verificationStatus?: VerificationStatus;
    };

    if (
      body.verificationStatus !== undefined &&
      body.verificationStatus !== 'pending' &&
      body.verificationStatus !== 'verified'
    ) {
      return Response.json({ error: 'Invalid verificationStatus' }, { status: 400 });
    }

    if (body.boxes !== undefined && !Array.isArray(body.boxes)) {
      return Response.json({ error: 'boxes must be an array' }, { status: 400 });
    }

    const updated = await updateFinding(id, {
      boxes: body.boxes,
      verificationStatus: body.verificationStatus,
    });

    if (!updated) {
      return Response.json({ error: 'Finding not found' }, { status: 404 });
    }

    return Response.json({ finding: updated });
  } catch (err) {
    console.error('Failed to update finding:', err);
    return Response.json({ error: 'Failed to update finding' }, { status: 500 });
  }
}
