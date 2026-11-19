import type { BoundingBox } from './types';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ViewportTransform {
  scale: number;
  x: number;
  y: number;
}

export const MIN_BOX_SIZE = 0.012;
export const MIN_SCALE = 0.08;
export const MAX_SCALE = 8;

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function roundBox(b: BoundingBox): BoundingBox {
  return [
    Number(b[0].toFixed(4)),
    Number(b[1].toFixed(4)),
    Number(b[2].toFixed(4)),
    Number(b[3].toFixed(4)),
  ];
}

export function moveBox(initial: BoundingBox, dx: number, dy: number): BoundingBox {
  const [ix1, iy1, ix2, iy2] = initial;
  const w = ix2 - ix1;
  const h = iy2 - iy1;
  const nx1 = Math.max(0, Math.min(1 - w, ix1 + dx));
  const ny1 = Math.max(0, Math.min(1 - h, iy1 + dy));
  return roundBox([nx1, ny1, nx1 + w, ny1 + h]);
}

export function resizeBox(
  initial: BoundingBox,
  handle: ResizeHandle,
  nx: number,
  ny: number
): BoundingBox {
  let [x1, y1, x2, y2] = initial;
  if (handle.includes('w')) x1 = Math.min(nx, initial[2] - MIN_BOX_SIZE);
  if (handle.includes('e')) x2 = Math.max(nx, initial[0] + MIN_BOX_SIZE);
  if (handle.includes('n')) y1 = Math.min(ny, initial[3] - MIN_BOX_SIZE);
  if (handle.includes('s')) y2 = Math.max(ny, initial[1] + MIN_BOX_SIZE);
  return roundBox([clamp01(x1), clamp01(y1), clamp01(x2), clamp01(y2)]);
}

export function boxFromPoints(
  xA: number,
  yA: number,
  xB: number,
  yB: number
): BoundingBox {
  return roundBox([
    Math.min(xA, xB),
    Math.min(yA, yB),
    Math.max(xA, xB),
    Math.max(yA, yB),
  ]);
}

export function computeFitTransform(
  vw: number,
  vh: number,
  nw: number,
  nh: number
): ViewportTransform {
  if (vw <= 0 || vh <= 0 || nw <= 0 || nh <= 0) return { scale: 1, x: 0, y: 0 };
  const pad = 44;
  const scale = Math.min((vw - pad) / nw, (vh - pad) / nh);
  const safeScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  return {
    scale: safeScale,
    x: (vw - nw * safeScale) / 2,
    y: (vh - nh * safeScale) / 2,
  };
}
