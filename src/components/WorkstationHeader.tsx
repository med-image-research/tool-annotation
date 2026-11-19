'use client';

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Keyboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Sun,
  Undo2,
} from 'lucide-react';

interface WorkstationHeaderProps {
  leftOpen: boolean;
  rightOpen: boolean;
  theme: 'light' | 'dark';
  currentImageId: string | null;
  currentIndex: number;
  totalFilteredCases: number;
  verifiedFindings: number;
  totalFindings: number;
  canUndo: boolean;
  canRedo: boolean;
  saveError: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleTheme: () => void;
  onPrevCase: () => void;
  onNextCase: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenShortcuts: () => void;
}

export function WorkstationHeader({
  leftOpen,
  rightOpen,
  theme,
  currentImageId,
  currentIndex,
  totalFilteredCases,
  verifiedFindings,
  totalFindings,
  canUndo,
  canRedo,
  saveError,
  onToggleLeft,
  onToggleRight,
  onToggleTheme,
  onPrevCase,
  onNextCase,
  onUndo,
  onRedo,
  onOpenShortcuts,
}: WorkstationHeaderProps) {
  const progressPct = totalFindings > 0 ? Math.round((verifiedFindings / totalFindings) * 100) : 0;

  return (
    <header className="h-12 px-3 border-b border-[var(--border-main)] bg-[var(--bg-panel)] flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleLeft}
          title={leftOpen ? 'Ẩn danh sách ca chụp' : 'Hiện danh sách ca chụp'}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control)] transition-colors"
        >
          {leftOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            ViX-Ray Verifier
          </span>
        </div>

        <div className="hidden md:block h-4 w-px bg-[var(--border-main)] mx-1" />

        {currentImageId && (
          <div className="flex items-center gap-1 bg-[var(--bg-control)] px-1.5 py-1 rounded-lg border border-[var(--border-main)]">
            <button
              type="button"
              onClick={onPrevCase}
              disabled={currentIndex <= 0}
              title="Ca trước ([)"
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-semibold text-[var(--accent-text)] px-1.5">
              {currentImageId}
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)] pr-1">
              {currentIndex >= 0 ? currentIndex + 1 : 1}/{totalFilteredCases}
            </span>
            <button
              type="button"
              onClick={onNextCase}
              disabled={currentIndex < 0 || currentIndex >= totalFilteredCases - 1}
              title="Ca tiếp theo (])"
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-secondary)]">Tiến độ:</span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            {verifiedFindings}/{totalFindings}
          </span>
          <div className="w-28 h-1.5 rounded-full bg-[var(--bg-control-hover)] overflow-hidden">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
            />
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{progressPct}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {saveError && (
          <span className="px-2 py-1 rounded-md bg-rose-500/15 border border-rose-500/35 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Lỗi lưu
          </span>
        )}

        <div className="flex items-center gap-0.5 bg-[var(--bg-control)] p-0.5 rounded-lg border border-[var(--border-main)]">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác chỉnh sửa BBox (Ctrl+Z)"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Làm lại (Ctrl+Shift+Z)"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-control)] hover:bg-[var(--bg-control-hover)] border border-[var(--border-main)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Tối</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sáng</span>
            </>
          )}
        </button>

        <a
          href="/api/export"
          download
          className="h-8 px-2.5 rounded-lg bg-[var(--bg-control)] hover:bg-[var(--bg-control-hover)] border border-[var(--border-main)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden sm:inline">Xuất CSV</span>
        </a>

        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Phím tắt (?)"
          className="h-8 w-8 rounded-lg bg-[var(--bg-control)] hover:bg-[var(--bg-control-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleRight}
          title={rightOpen ? 'Ẩn bảng Reference Findings' : 'Hiện bảng Reference Findings'}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control)] transition-colors"
        >
          {rightOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
