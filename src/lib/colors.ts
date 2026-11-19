export interface FindingColor {
  name: string;
  hex: string;
  fill: string;
  fillStrong: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * High-contrast, colorblind-conscious clinical palette tuned for both
 * monochrome X-ray overlays and light/dark workstation panels.
 */
export const FINDING_PALETTE: FindingColor[] = [
  {
    name: 'Cyan',
    hex: '#06B6D4',
    fill: 'rgba(6, 182, 212, 0.11)',
    fillStrong: 'rgba(6, 182, 212, 0.24)',
    badgeBg: 'rgba(6, 182, 212, 0.16)',
    badgeText: '#0891B2',
  },
  {
    name: 'Amber',
    hex: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.11)',
    fillStrong: 'rgba(245, 158, 11, 0.24)',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    badgeText: '#B45309',
  },
  {
    name: 'Rose',
    hex: '#F43F5E',
    fill: 'rgba(244, 63, 94, 0.11)',
    fillStrong: 'rgba(244, 63, 94, 0.24)',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeText: '#BE123C',
  },
  {
    name: 'Emerald',
    hex: '#10B981',
    fill: 'rgba(16, 185, 129, 0.11)',
    fillStrong: 'rgba(16, 185, 129, 0.24)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeText: '#047857',
  },
  {
    name: 'Violet',
    hex: '#8B5CF6',
    fill: 'rgba(139, 92, 246, 0.11)',
    fillStrong: 'rgba(139, 92, 246, 0.24)',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeText: '#6D28D9',
  },
  {
    name: 'Orange',
    hex: '#F97316',
    fill: 'rgba(249, 115, 22, 0.11)',
    fillStrong: 'rgba(249, 115, 22, 0.24)',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeText: '#C2410C',
  },
  {
    name: 'Blue',
    hex: '#3B82F6',
    fill: 'rgba(59, 130, 246, 0.11)',
    fillStrong: 'rgba(59, 130, 246, 0.24)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeText: '#1D4ED8',
  },
  {
    name: 'Pink',
    hex: '#EC4899',
    fill: 'rgba(236, 72, 153, 0.11)',
    fillStrong: 'rgba(236, 72, 153, 0.24)',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeText: '#BE185D',
  },
];

export function getFindingColor(index: number): FindingColor {
  return FINDING_PALETTE[((index % FINDING_PALETTE.length) + FINDING_PALETTE.length) % FINDING_PALETTE.length];
}
