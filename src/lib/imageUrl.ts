export function getXrayImageSrc(imageId: string): string {
  const cdnBase = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL?.trim();
  if (cdnBase) {
    return `${cdnBase.replace(/\/+$/, '')}/${imageId}.jpg`;
  }
  return `/api/images/${encodeURIComponent(imageId)}`;
}
