'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

interface ResizeDividerProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

export function ResizeDivider({ onPointerDown }: ResizeDividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-sky-500/50 active:bg-sky-500 transition-colors"
    />
  );
}
