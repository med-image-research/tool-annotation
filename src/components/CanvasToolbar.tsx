'use client';

import { useState } from 'react';
import {
  Contrast,
  Eye,
  EyeOff,
  GitCompare,
  Hand,
  Maximize2,
  MousePointer,
  RotateCcw,
  SquarePlus,
  SunMedium,
  Tag,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { CanvasTool } from './XrayCanvas';

interface CanvasToolbarProps {
  tool: CanvasTool;
  spacePressed: boolean;
  zoomPercent: number;
  showAllBoxes: boolean;
  showLabels: boolean;
  showGhostOriginal: boolean;
  invertImage: boolean;
  brightness: number;
  contrast: number;
  onToolChange: (t: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleShowAllBoxes: () => void;
  onToggleLabels: () => void;
  onToggleGhostOriginal: () => void;
  onToggleInvert: () => void;
  onBrightnessChange: (val: number) => void;
  onContrastChange: (val: number) => void;
  onResetEnhancements: () => void;
}

export function CanvasToolbar({
  tool,
  spacePressed,
  zoomPercent,
  showAllBoxes,
  showLabels,
  showGhostOriginal,
  invertImage,
  brightness,
  contrast,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleShowAllBoxes,
  onToggleLabels,
  onToggleGhostOriginal,
  onToggleInvert,
  onBrightnessChange,
  onContrastChange,
  onResetEnhancements,
}: CanvasToolbarProps) {
  const [showEnhancePopover, setShowEnhancePopover] = useState(false);
  const isModifiedEnhancement = brightness !== 100 || contrast !== 100 || invertImage;

  return (
    <div className="min-h-11 px-2.5 py-1.5 border-b border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-wrap items-center justify-between gap-1.5 z-30 shrink-0">
      <div className="flex items-center gap-0.5 bg-[var(--bg-control)] p-0.5 rounded-lg border border-[var(--border-main)]">
        <button
          type="button"
          onClick={() => onToolChange('select')}
          title="Chọn & Chỉnh sửa BBox (Phím V)"
          className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border ${
            tool === 'select'
              ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border-[var(--accent-border)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Chọn</span>
          <kbd className="text-[10px] font-mono opacity-60">V</kbd>
        </button>

        <button
          type="button"
          onClick={() => onToolChange('draw')}
          title="Vẽ BBox mới cho Finding đang chọn (Phím B)"
          className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border ${
            tool === 'draw'
              ? 'bg-amber-500/18 text-amber-700 dark:text-amber-300 border-amber-500/45'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent'
          }`}
        >
          <SquarePlus className="w-3.5 h-3.5" />
          <span>Vẽ</span>
          <kbd className="text-[10px] font-mono opacity-60">B</kbd>
        </button>

        <button
          type="button"
          onClick={() => onToolChange('pan')}
          title="Kéo di chuyển ảnh (Phím H hoặc giữ Space)"
          className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border ${
            tool === 'pan' || spacePressed
              ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Kéo</span>
          <kbd className="text-[10px] font-mono opacity-60">H</kbd>
        </button>
      </div>

      <div className="flex items-center gap-0.5 bg-[var(--bg-control)] px-1 py-0.5 rounded-lg border border-[var(--border-main)]">
        <button
          type="button"
          onClick={onZoomOut}
          title="Thu nhỏ"
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs text-[var(--text-primary)] w-11 text-center select-none">
          {zoomPercent}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          title="Phóng to"
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-[var(--border-strong)] mx-0.5" />
        <button
          type="button"
          onClick={onFit}
          title="Vừa khung hình (Phím 0 hoặc R)"
          className="px-1.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)] flex items-center gap-1"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit</span>
        </button>
      </div>

      <div className="flex items-center gap-1 relative">
        <button
          type="button"
          onClick={onToggleShowAllBoxes}
          title="Ẩn/Hiện toàn bộ BBox để quan sát phim gốc"
          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition-colors ${
            showAllBoxes
              ? 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)]'
              : 'bg-amber-500/18 border-amber-500/45 text-amber-700 dark:text-amber-300'
          }`}
        >
          {showAllBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden 2xl:inline">{showAllBoxes ? 'Hiện BBox' : 'Đang ẩn'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleGhostOriginal}
          title="Hiện viền nét đứt của BBox gốc từ CSV để so sánh (Phím G)"
          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition-colors ${
            showGhostOriginal
              ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--accent-text)]'
              : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Box gốc</span>
        </button>

        <button
          type="button"
          onClick={onToggleLabels}
          title="Hiện/Ẩn nhãn RF trên ảnh (Phím L)"
          className={`p-1.5 rounded-md border transition-colors ${
            showLabels
              ? 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-primary)]'
              : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-muted)]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleInvert}
          title="Đảo ngược âm bản phim X-quang (Phím I)"
          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition-colors ${
            invertImage
              ? 'bg-[var(--text-primary)] text-[var(--bg-panel)] border-[var(--text-primary)]'
              : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Contrast className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Âm bản</span>
        </button>

        <button
          type="button"
          onClick={() => setShowEnhancePopover((v) => !v)}
          title="Chỉnh độ sáng / tương phản"
          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition-colors ${
            showEnhancePopover || isModifiedEnhancement
              ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--accent-text)]'
              : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <SunMedium className="w-3.5 h-3.5" />
          <span>Sáng/Nét</span>
        </button>

        {showEnhancePopover && (
          <div className="absolute right-0 top-10 w-64 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-strong)] shadow-2xl p-3.5 z-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Độ sáng & Tương phản
              </span>
              <button
                type="button"
                onClick={onResetEnhancements}
                className="text-[11px] text-[var(--accent-text)] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Đặt lại
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Độ sáng</span>
                <span className="font-mono text-[var(--text-primary)]">{brightness}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={180}
                value={brightness}
                onChange={(e) => onBrightnessChange(Number(e.target.value))}
                className="w-full pacs-slider"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Tương phản</span>
                <span className="font-mono text-[var(--text-primary)]">{contrast}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={220}
                value={contrast}
                onChange={(e) => onContrastChange(Number(e.target.value))}
                className="w-full pacs-slider"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
