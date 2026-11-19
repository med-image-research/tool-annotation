'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Trash2 } from 'lucide-react';
import {
  MAX_SCALE,
  MIN_BOX_SIZE,
  boxFromPoints,
  clamp01,
  computeFitTransform,
  moveBox,
  resizeBox,
  type ResizeHandle,
  type ViewportTransform,
} from '@/lib/bbox';
import { getFindingColor } from '@/lib/colors';
import { boxesEqual } from '@/lib/csv';
import { getXrayImageSrc } from '@/lib/imageUrl';
import type { BoundingBox, ReferenceFinding } from '@/lib/types';
import { CanvasToolbar } from './CanvasToolbar';

export type CanvasTool = 'select' | 'draw' | 'pan';

export interface SelectedBoxRef {
  findingId: string;
  boxIndex: number;
}

interface XrayCanvasProps {
  imageId: string;
  findings: ReferenceFinding[];
  activeFindingId: string | null;
  selectedBox: SelectedBoxRef | null;
  hiddenFindingIds: Set<string>;
  soloFindingId: string | null;
  tool: CanvasTool;
  showAllBoxes: boolean;
  showLabels: boolean;
  showGhostOriginal: boolean;
  invertImage: boolean;
  brightness: number;
  contrast: number;
  onToolChange: (t: CanvasTool) => void;
  onSelectBox: (ref: SelectedBoxRef | null) => void;
  onSelectFinding: (findingId: string) => void;
  onUpdateBox: (findingId: string, boxIndex: number, nextBox: BoundingBox, commit: boolean) => void;
  onAddBox: (findingId: string, newBox: BoundingBox) => void;
  onDeleteBox: (findingId: string, boxIndex: number) => void;
  onToggleShowAllBoxes: () => void;
  onToggleLabels: () => void;
  onToggleGhostOriginal: () => void;
  onToggleInvert: () => void;
  onBrightnessChange: (val: number) => void;
  onContrastChange: (val: number) => void;
  onResetEnhancements: () => void;
}

type DragSession =
  | {
      kind: 'pan';
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      kind: 'draw';
      findingId: string;
      startNx: number;
      startNy: number;
      currentNx: number;
      currentNy: number;
    }
  | {
      kind: 'move';
      findingId: string;
      boxIndex: number;
      startNx: number;
      startNy: number;
      initialBox: BoundingBox;
      moved: boolean;
    }
  | {
      kind: 'resize';
      findingId: string;
      boxIndex: number;
      handle: ResizeHandle;
      initialBox: BoundingBox;
      moved: boolean;
    };

const RESIZE_HANDLES: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: 'nw', className: '-top-1.5 -left-1.5', cursor: 'nwse-resize' },
  { id: 'n', className: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'ne', className: '-top-1.5 -right-1.5', cursor: 'nesw-resize' },
  { id: 'e', className: 'top-1/2 -right-1.5 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'se', className: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
  { id: 's', className: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'sw', className: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
  { id: 'w', className: 'top-1/2 -left-1.5 -translate-y-1/2', cursor: 'ew-resize' },
];

export function XrayCanvas({
  imageId,
  findings,
  activeFindingId,
  selectedBox,
  hiddenFindingIds,
  soloFindingId,
  tool,
  showAllBoxes,
  showLabels,
  showGhostOriginal,
  invertImage,
  brightness,
  contrast,
  onToolChange,
  onSelectBox,
  onSelectFinding,
  onUpdateBox,
  onAddBox,
  onDeleteBox,
  onToggleShowAllBoxes,
  onToggleLabels,
  onToggleGhostOriginal,
  onToggleInvert,
  onBrightnessChange,
  onContrastChange,
  onResetEnhancements,
}: XrayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const hasFittedRef = useRef(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [transform, setTransform] = useState<ViewportTransform>({ scale: 1, x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [cursorNorm, setCursorNorm] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);

  const imgSrc = getXrayImageSrc(imageId);

  const fitScale = useMemo(
    () => computeFitTransform(viewportSize.w, viewportSize.h, naturalSize.w, naturalSize.h).scale,
    [naturalSize.h, naturalSize.w, viewportSize.h, viewportSize.w]
  );

  const handleFit = useCallback(() => {
    setTransform(
      computeFitTransform(viewportSize.w, viewportSize.h, naturalSize.w, naturalSize.h)
    );
  }, [naturalSize.h, naturalSize.w, viewportSize.h, viewportSize.w]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const vw = entry.contentRect.width;
        const vh = entry.contentRect.height;
        setViewportSize({ w: vw, h: vh });
        if (!hasFittedRef.current && naturalSizeRef.current.w > 0 && vw > 0 && vh > 0) {
          hasFittedRef.current = true;
          setTransform(
            computeFitTransform(vw, vh, naturalSizeRef.current.w, naturalSizeRef.current.h)
          );
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const isInput = (t: EventTarget | null) =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInput(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      } else if ((e.key === '0' || e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleFit();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleFit]);

  const zoomAtPoint = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const el = containerRef.current;
      if (!el || naturalSize.w <= 0) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
      const my = clientY !== undefined ? clientY - rect.top : rect.height / 2;

      setTransform((prev) => {
        const nextScale = Math.max(fitScale * 0.45, Math.min(MAX_SCALE, prev.scale * factor));
        const ix = (mx - prev.x) / (naturalSize.w * prev.scale);
        const iy = (my - prev.y) / (naturalSize.h * prev.scale);
        return {
          scale: nextScale,
          x: mx - ix * naturalSize.w * nextScale,
          y: my - iy * naturalSize.h * nextScale,
        };
      });
    },
    [fitScale, naturalSize.h, naturalSize.w]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtPoint(e.deltaY < 0 ? 1.14 : 1 / 1.14, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  const eventToNorm = useCallback(
    (el: HTMLElement, clientX: number, clientY: number) => {
      const vp = el.closest('[data-pacs-viewport]');
      if (!vp || naturalSize.w <= 0 || naturalSize.h <= 0) return null;
      const rect = vp.getBoundingClientRect();
      return {
        nx: clamp01((clientX - rect.left - transform.x) / (naturalSize.w * transform.scale)),
        ny: clamp01((clientY - rect.top - transform.y) / (naturalSize.h * transform.scale)),
      };
    },
    [naturalSize.h, naturalSize.w, transform.scale, transform.x, transform.y]
  );

  const effectiveTool: CanvasTool = spacePressed ? 'pan' : tool;

  const startPan = (e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      kind: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: transform.x,
      startY: transform.y,
    });
  };

  const handleViewportPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || effectiveTool === 'pan') {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;

    if (effectiveTool === 'draw') {
      const targetFindingId = activeFindingId ?? findings[0]?.id;
      const pt = targetFindingId ? eventToNorm(e.currentTarget, e.clientX, e.clientY) : null;
      if (!targetFindingId || !pt) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        kind: 'draw',
        findingId: targetFindingId,
        startNx: pt.nx,
        startNy: pt.ny,
        currentNx: pt.nx,
        currentNy: pt.ny,
      });
      return;
    }

    onSelectBox(null);
  };

  const handleViewportPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const norm = eventToNorm(e.currentTarget, e.clientX, e.clientY);
    if (norm) setCursorNorm({ x: norm.nx, y: norm.ny });
    if (!drag) return;

    if (drag.kind === 'pan') {
      setTransform((prev) => ({
        ...prev,
        x: drag.startX + (e.clientX - drag.startClientX),
        y: drag.startY + (e.clientY - drag.startClientY),
      }));
      return;
    }
    if (!norm) return;

    if (drag.kind === 'draw') {
      setDrag({ ...drag, currentNx: norm.nx, currentNy: norm.ny });
      return;
    }

    if (drag.kind === 'move') {
      const dx = norm.nx - drag.startNx;
      const dy = norm.ny - drag.startNy;
      if (!drag.moved && (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001)) {
        setDrag({ ...drag, moved: true });
      }
      onUpdateBox(drag.findingId, drag.boxIndex, moveBox(drag.initialBox, dx, dy), false);
      return;
    }

    if (drag.kind === 'resize') {
      if (!drag.moved) setDrag({ ...drag, moved: true });
      onUpdateBox(
        drag.findingId,
        drag.boxIndex,
        resizeBox(drag.initialBox, drag.handle, norm.nx, norm.ny),
        false
      );
    }
  };

  const handleViewportPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drag.kind === 'draw') {
      const box = boxFromPoints(drag.startNx, drag.startNy, drag.currentNx, drag.currentNy);
      if (box[2] - box[0] >= MIN_BOX_SIZE && box[3] - box[1] >= MIN_BOX_SIZE) {
        onAddBox(drag.findingId, box);
      }
    } else if ((drag.kind === 'move' || drag.kind === 'resize') && drag.moved) {
      const current = findings.find((item) => item.id === drag.findingId)?.boxes[drag.boxIndex];
      if (current) onUpdateBox(drag.findingId, drag.boxIndex, current, true);
    }

    setDrag(null);
  };

  const visibleFindings = useMemo(() => {
    if (!showAllBoxes) return [];
    return findings.filter((f) =>
      soloFindingId ? f.id === soloFindingId : !hiddenFindingIds.has(f.id)
    );
  }, [findings, hiddenFindingIds, showAllBoxes, soloFindingId]);

  const activeFinding = findings.find((f) => f.id === activeFindingId) ?? findings[0] ?? null;
  const activeColor = activeFinding ? getFindingColor(activeFinding.rfIndex) : getFindingColor(0);

  const zoomPercent = fitScale > 0 ? Math.round((transform.scale / fitScale) * 100) : 100;
  const displayW = naturalSize.w * transform.scale;
  const displayH = naturalSize.h * transform.scale;

  const selectedBoxCoords = useMemo(() => {
    if (!selectedBox) return null;
    return findings.find((item) => item.id === selectedBox.findingId)?.boxes[selectedBox.boxIndex] ?? null;
  }, [findings, selectedBox]);

  const drawPreviewBox: BoundingBox | null =
    drag?.kind === 'draw'
      ? boxFromPoints(drag.startNx, drag.startNy, drag.currentNx, drag.currentNy)
      : null;

  const cursorClass =
    effectiveTool === 'pan'
      ? drag?.kind === 'pan'
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : effectiveTool === 'draw'
        ? 'cursor-crosshair'
        : 'cursor-default';

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-[var(--bg-viewport)] relative">
      <CanvasToolbar
        tool={tool}
        spacePressed={spacePressed}
        zoomPercent={zoomPercent}
        showAllBoxes={showAllBoxes}
        showLabels={showLabels}
        showGhostOriginal={showGhostOriginal}
        invertImage={invertImage}
        brightness={brightness}
        contrast={contrast}
        onToolChange={onToolChange}
        onZoomIn={() => zoomAtPoint(1.25)}
        onZoomOut={() => zoomAtPoint(1 / 1.25)}
        onFit={handleFit}
        onToggleShowAllBoxes={onToggleShowAllBoxes}
        onToggleLabels={onToggleLabels}
        onToggleGhostOriginal={onToggleGhostOriginal}
        onToggleInvert={onToggleInvert}
        onBrightnessChange={onBrightnessChange}
        onContrastChange={onContrastChange}
        onResetEnhancements={onResetEnhancements}
      />

      <div
        ref={containerRef}
        data-pacs-viewport="true"
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerLeave={() => setCursorNorm(null)}
        className={`flex-1 relative overflow-hidden pacs-viewport-bg select-none ${cursorClass}`}
      >
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-rose-500">
              Không tải được ảnh {imageId}.jpg
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md">
              Kiểm tra thư mục ảnh trong{' '}
              <code className="font-mono text-[var(--text-primary)]">LOCAL_IMAGES_DIR</code> hoặc cấu hình CDN.
            </p>
          </div>
        ) : (
          <div
            style={{
              width: displayW > 0 ? `${displayW}px` : 'auto',
              height: displayH > 0 ? `${displayH}px` : 'auto',
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              transformOrigin: '0 0',
            }}
            className="absolute top-0 left-0 will-change-transform"
          >
            {/* Native img required for lossless CSS Window/Level filters and pixel zoom */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imageId}
              src={imgSrc}
              alt={`Ảnh X-quang ${imageId}`}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                const nw = img.naturalWidth;
                const nh = img.naturalHeight;
                naturalSizeRef.current = { w: nw, h: nh };
                setNaturalSize({ w: nw, h: nh });
                setLoadedImageId(imageId);
                setImageError(false);

                const vp = img.closest('[data-pacs-viewport]');
                const rect = vp?.getBoundingClientRect();
                if (rect && rect.width > 0 && rect.height > 0) {
                  hasFittedRef.current = true;
                  setTransform(computeFitTransform(rect.width, rect.height, nw, nh));
                }
              }}
              onError={() => setImageError(true)}
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${invertImage ? 1 : 0})`,
              }}
              className="w-full h-full block pointer-events-none select-none"
            />

            {effectiveTool === 'draw' && cursorNorm && loadedImageId === imageId && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  style={{ left: `${cursorNorm.x * 100}%`, borderColor: activeColor.hex }}
                  className="absolute top-0 bottom-0 border-l border-dashed opacity-45"
                />
                <div
                  style={{ top: `${cursorNorm.y * 100}%`, borderColor: activeColor.hex }}
                  className="absolute left-0 right-0 border-t border-dashed opacity-45"
                />
              </div>
            )}

            {showAllBoxes &&
              showGhostOriginal &&
              loadedImageId === imageId &&
              visibleFindings.map((f) => {
                if (boxesEqual(f.boxes, f.originalBoxes)) return null;
                const color = getFindingColor(f.rfIndex);
                return f.originalBoxes.map((b, bIdx) => (
                  <div
                    key={`ghost-${f.id}-${bIdx}`}
                    style={{
                      left: `${b[0] * 100}%`,
                      top: `${b[1] * 100}%`,
                      width: `${(b[2] - b[0]) * 100}%`,
                      height: `${(b[3] - b[1]) * 100}%`,
                      borderColor: color.hex,
                    }}
                    className="absolute border border-dashed opacity-45 pointer-events-none"
                  />
                ));
              })}

            {loadedImageId === imageId &&
              visibleFindings.map((f) => {
                const color = getFindingColor(f.rfIndex);
                const isActiveFinding = f.id === activeFinding?.id;

                return f.boxes.map((b, bIdx) => {
                  const isSelected =
                    selectedBox?.findingId === f.id && selectedBox?.boxIndex === bIdx;
                  const nearTop = b[1] < 0.055;
                  const labelText =
                    f.boxes.length > 1 ? `${f.rfLabel} · ${bIdx + 1}` : f.rfLabel;

                  return (
                    <div
                      key={`${f.id}-box-${bIdx}`}
                      onPointerDown={(e) => {
                        if (e.button === 1 || effectiveTool !== 'select' || e.button !== 0) return;
                        e.stopPropagation();
                        onSelectFinding(f.id);
                        onSelectBox({ findingId: f.id, boxIndex: bIdx });

                        const pt = eventToNorm(e.currentTarget, e.clientX, e.clientY);
                        if (!pt) return;
                        e.currentTarget.closest('[data-pacs-viewport]')?.setPointerCapture(e.pointerId);
                        setDrag({
                          kind: 'move',
                          findingId: f.id,
                          boxIndex: bIdx,
                          startNx: pt.nx,
                          startNy: pt.ny,
                          initialBox: [...b] as BoundingBox,
                          moved: false,
                        });
                      }}
                      style={{
                        left: `${b[0] * 100}%`,
                        top: `${b[1] * 100}%`,
                        width: `${(b[2] - b[0]) * 100}%`,
                        height: `${(b[3] - b[1]) * 100}%`,
                        borderColor: color.hex,
                        backgroundColor: isSelected
                          ? color.fillStrong
                          : isActiveFinding
                            ? color.fill
                            : 'transparent',
                        boxShadow: isSelected
                          ? '0 0 0 1px #ffffff, 0 0 16px rgba(0,0,0,0.65)'
                          : undefined,
                      }}
                      className={`absolute border-2 transition-colors ${
                        effectiveTool === 'select'
                          ? 'cursor-move pointer-events-auto'
                          : 'pointer-events-none'
                      } ${isSelected ? 'z-20' : isActiveFinding ? 'z-10' : 'z-0'}`}
                    >
                      {(showLabels || isSelected) && (
                        <div
                          style={{ backgroundColor: color.hex, color: '#ffffff' }}
                          className={`absolute ${
                            nearTop ? 'top-1 left-1' : '-top-[22px] left-0'
                          } px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none flex items-center gap-1 whitespace-nowrap shadow-md`}
                        >
                          <span>{labelText}</span>
                          {f.verificationStatus === 'verified' && <span>✓</span>}
                          {isSelected && (
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBox(f.id, bIdx);
                              }}
                              title="Xóa BBox này (Delete)"
                              className="ml-0.5 p-0.5 rounded hover:bg-black/20"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {isSelected &&
                        effectiveTool === 'select' &&
                        RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return;
                              e.stopPropagation();
                              e.currentTarget.closest('[data-pacs-viewport]')?.setPointerCapture(e.pointerId);
                              setDrag({
                                kind: 'resize',
                                findingId: f.id,
                                boxIndex: bIdx,
                                handle: h.id,
                                initialBox: [...b] as BoundingBox,
                                moved: false,
                              });
                            }}
                            style={{ cursor: h.cursor, borderColor: color.hex }}
                            className={`absolute ${h.className} w-2.5 h-2.5 rounded-[2px] bg-white border-2 shadow`}
                          />
                        ))}
                    </div>
                  );
                });
              })}

            {drawPreviewBox && (
              <div
                style={{
                  left: `${drawPreviewBox[0] * 100}%`,
                  top: `${drawPreviewBox[1] * 100}%`,
                  width: `${(drawPreviewBox[2] - drawPreviewBox[0]) * 100}%`,
                  height: `${(drawPreviewBox[3] - drawPreviewBox[1]) * 100}%`,
                  borderColor: activeColor.hex,
                  backgroundColor: activeColor.fillStrong,
                }}
                className="absolute border-2 border-dashed pointer-events-none z-30"
              >
                <div
                  style={{ backgroundColor: activeColor.hex, color: '#ffffff' }}
                  className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
                >
                  {activeFinding?.rfLabel} ·{' '}
                  {Math.round((drawPreviewBox[2] - drawPreviewBox[0]) * 100)}% ×{' '}
                  {Math.round((drawPreviewBox[3] - drawPreviewBox[1]) * 100)}%
                </div>
              </div>
            )}
          </div>
        )}

        {activeFinding && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-panel)]/92 backdrop-blur-md border border-[var(--border-main)] shadow-md max-w-[55%]">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeColor.hex }}
            />
            <span
              className="font-mono text-[11px] font-bold shrink-0"
              style={{ color: activeColor.badgeText }}
            >
              {activeFinding.rfLabel}
            </span>
            <span className="text-xs text-[var(--text-primary)] truncate">
              {activeFinding.findingText}
            </span>
            {tool === 'draw' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                Kéo chuột để vẽ
              </span>
            )}
          </div>
        )}

        {loadedImageId !== imageId && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-3.5 py-2 rounded-lg bg-[var(--bg-panel)]/95 border border-[var(--border-main)] text-xs text-[var(--text-primary)] font-mono shadow-sm">
              Đang tải phim {imageId}...
            </div>
          </div>
        )}
      </div>

      <div className="h-8 px-3 border-t border-[var(--border-main)] bg-[var(--bg-subpanel)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] shrink-0">
        <div className="flex items-center gap-3 font-mono">
          <span>{naturalSize.w > 0 ? `${naturalSize.w}×${naturalSize.h}px` : '—'}</span>
          {cursorNorm && (
            <span>
              xy: ({cursorNorm.x.toFixed(3)}, {cursorNorm.y.toFixed(3)})
            </span>
          )}
          {selectedBoxCoords && (
            <span className="text-[var(--accent-text)] hidden md:inline">
              box: [{selectedBoxCoords.map((n) => n.toFixed(3)).join(', ')}]
            </span>
          )}
        </div>
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span>Cuộn: Zoom</span>
          <span>Space+Kéo: Di chuyển</span>
          <span>1: Phù hợp</span>
          <span>Del: Xóa box</span>
        </div>
      </div>
    </section>
  );
}
