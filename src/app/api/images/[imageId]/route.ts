import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { buildCdnImageUrl } from '@/lib/imageUrl';

const DEFAULT_LOCAL_IMAGES_DIR = 'D:\\uit\\kltn\\requirement_ViX-Ray\\images';

function isValidImageId(id: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(id);
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/images/[imageId]'>
) {
  const { imageId } = await ctx.params;

  if (!isValidImageId(imageId)) {
    return Response.json({ error: 'Invalid image ID' }, { status: 400 });
  }

  const cdnBase = process.env.IMAGE_CDN_BASE_URL?.trim();
  if (cdnBase) {
    return Response.redirect(buildCdnImageUrl(cdnBase, imageId), 307);
  }

  const publicXrayPath = path.join(process.cwd(), 'public', 'xrays', `${imageId}.jpg`);
  const localDir = process.env.LOCAL_IMAGES_DIR?.trim() || DEFAULT_LOCAL_IMAGES_DIR;
  const localXrayPath = path.join(localDir, `${imageId}.jpg`);

  for (const filePath of [publicXrayPath, localXrayPath]) {
    try {
      const buffer = await fs.readFile(/*turbopackIgnore: true*/ filePath);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
    }
  }

  return Response.json({ error: `Image ${imageId}.jpg not found` }, { status: 404 });
}
