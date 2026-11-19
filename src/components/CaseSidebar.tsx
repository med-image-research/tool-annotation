'use client';

import { CheckCircle2, Clock, PencilRuler, Search, X } from 'lucide-react';
import { getFindingColor } from '@/lib/colors';
import type { XrayCase } from '@/lib/types';

export type CaseFilter = 'all' | 'pending' | 'manual' | 'verified';

interface CaseSidebarProps {
  width: number;
  cases: XrayCase[];
  filteredCases: XrayCase[];
  selectedImageId: string | null;
  filter: CaseFilter;
  searchQuery: string;
  onFilterChange: (f: CaseFilter) => void;
  onSearchChange: (q: string) => void;
  onSelectCase: (imageId: string) => void;
}

export function getCaseSummary(c: XrayCase) {
  const total = c.findings.length;
  const verified = c.findings.filter((f) => f.verificationStatus === 'verified').length;
  const manual = c.findings.filter((f) => f.boxes.length === 0).length;
  const allVerified = total > 0 && verified === total;

  return { total, verified, manual, allVerified };
}

export function CaseSidebar({
  width,
  cases,
  filteredCases,
  selectedImageId,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onSelectCase,
}: CaseSidebarProps) {
  const counts = {
    all: cases.length,
    pending: cases.filter((c) => !getCaseSummary(c).allVerified).length,
    manual: cases.filter((c) => c.findings.some((f) => f.boxes.length === 0)).length,
    verified: cases.filter((c) => getCaseSummary(c).allVerified).length,
  };

  const filterTabs: { id: CaseFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', count: counts.all },
    { id: 'pending', label: 'Chờ duyệt', count: counts.pending },
    { id: 'manual', label: 'Vẽ tay', count: counts.manual },
    { id: 'verified', label: 'Hoàn tất', count: counts.verified },
  ];

  return (
    <aside
      style={{ width }}
      className="shrink-0 border-r border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-col min-h-0"
    >
      <div className="p-3 border-b border-[var(--border-main)] space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã VX hoặc tổn thương..."
            className="w-full h-8 pl-8 pr-7 rounded-md bg-[var(--bg-control)] border border-[var(--border-main)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-sky-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {filterTabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange(tab.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border ${
                  active
                    ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border-[var(--accent-border)]'
                    : 'bg-[var(--bg-control)] text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-control-hover)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-75">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCases.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-[var(--text-muted)]">
            Không có ca chụp nào khớp bộ lọc.
          </div>
        ) : (
          filteredCases.map((c) => {
            const active = c.imageId === selectedImageId;
            const summary = getCaseSummary(c);

            return (
              <button
                key={c.imageId}
                type="button"
                onClick={() => onSelectCase(c.imageId)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all group ${
                  active
                    ? 'bg-[var(--bg-card-active)] border-[var(--accent-border)] shadow-[inset_2px_0_0_0_#0ea5e9]'
                    : 'bg-transparent border-transparent hover:bg-[var(--bg-control)] hover:border-[var(--border-main)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-semibold tracking-tight ${
                      active ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {c.imageId}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {summary.verified}/{summary.total}
                    </span>
                    {summary.allVerified ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : summary.manual > 0 ? (
                      <PencilRuler className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )}
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-[var(--text-secondary)] truncate">
                  {c.findings[0]?.findingText}
                  {c.findings.length > 1 ? ` (+${c.findings.length - 1})` : ''}
                </p>

                <div className="mt-1.5 flex items-center flex-wrap gap-1">
                  {c.findings.map((f) => {
                    const color = getFindingColor(f.rfIndex);
                    const ringClass =
                      f.verificationStatus === 'verified' ? 'ring-1 ring-emerald-500' : '';
                    return (
                      <span
                        key={f.id}
                        title={`${f.rfLabel}: ${f.findingText}`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${ringClass}`}
                        style={{
                          backgroundColor: color.badgeBg,
                          color: color.badgeText,
                        }}
                      >
                        {f.rfLabel}
                        {f.boxes.length === 0 ? '·?' : ''}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
