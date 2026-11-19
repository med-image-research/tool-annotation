/**
 * Joins an image filename onto a base URL while preserving query parameters
 * such as Azure Blob SAS tokens.
 */
export function buildCdnImageUrl(baseUrl: string, imageId: string): string {
  const trimmed = baseUrl.trim();
  const qIndex = trimmed.indexOf('?');
  const basePath = (qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed).replace(/\/+$/, '');
  const query = qIndex >= 0 ? trimmed.slice(qIndex) : '';
  return `${basePath}/${encodeURIComponent(imageId)}.jpg${query}`;
}

export function getXrayImageSrc(imageId: string): string {
  const cdnBase = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL?.trim();
  if (cdnBase) {
    return buildCdnImageUrl(cdnBase, imageId);
  }
  return `/api/images/${encodeURIComponent(imageId)}`;
}
