'use client';

import {
  ArrowRight,
  Check,
  CheckCheck,
  Crosshair,
  Eye,
  EyeOff,
  RotateCcw,
  SquarePlus,
  Trash2,
} from 'lucide-react';
import { getFindingColor } from '@/lib/colors';
import { boxesEqual } from '@/lib/csv';
import type { ReferenceFinding, VerificationStatus } from '@/lib/types';
import type { SelectedBoxRef } from './XrayCanvas';

interface FindingsPanelProps {
  width: number;
  imageId: string;
  findings: ReferenceFinding[];
  activeFindingId: string | null;
  selectedBox: SelectedBoxRef | null;
  hiddenFindingIds: Set<string>;
  soloFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onSelectBox: (ref: SelectedBoxRef) => void;
  onStartDrawForFinding: (findingId: string) => void;
  onDeleteBox: (findingId: string, boxIndex: number) => void;
  onResetBoxesToOriginal: (findingId: string) => void;
  onToggleVisibility: (findingId: string) => void;
  onShowAllFindings: () => void;
  onHideAllFindings: () => void;
  onToggleSolo: (findingId: string) => void;
  onVerifyFinding: (findingId: string, status: VerificationStatus) => void;
  onVerifyAllAndNext: () => void;
  hasNextCase: boolean;
}

interface FindingCardProps {
  finding: ReferenceFinding;
  isActive: boolean;
  isHidden: boolean;
  isSolo: boolean;
  selectedBox: SelectedBoxRef | null;
  onSelect: () => void;
  onSelectBox: (ref: SelectedBoxRef) => void;
  onStartDraw: () => void;
  onDeleteBox: (boxIndex: number) => void;
  onResetOriginal: () => void;
  onToggleVisibility: () => void;
  onToggleSolo: () => void;
  onVerify: (status: VerificationStatus) => void;
}

function FindingCard({
  finding,
  isActive,
  isHidden,
  isSolo,
  selectedBox,
  onSelect,
  onSelectBox,
  onStartDraw,
  onDeleteBox,
  onResetOriginal,
  onToggleVisibility,
  onToggleSolo,
  onVerify,
}: FindingCardProps) {
  const color = getFindingColor(finding.rfIndex);
  const isModified = !boxesEqual(finding.boxes, finding.originalBoxes);
  const isVerified = finding.verificationStatus === 'verified';

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isActive
          ? 'bg-[var(--bg-card-active)] border-[var(--accent-border)] shadow-sm'
          : 'bg-[var(--bg-card)] border-[var(--border-main)] hover:border-[var(--border-strong)]'
      } ${isHidden ? 'opacity-65' : ''}`}
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: color.hex }} />

        <div className="flex-1 p-3 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 text-white"
                style={{ backgroundColor: color.hex }}
              >
                {finding.rfLabel}
              </span>
              <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate">
                {finding.id}
              </span>
              {finding.impressionRelevancePrior === 'no' && (
                <span
                  title="Không nằm trong impression kết luận gốc"
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-control)] text-[var(--text-secondary)] border border-[var(--border-main)] shrink-0"
                >
                  Ngoài KL
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={onToggleSolo}
                title={isSolo ? 'Tắt chế độ chỉ xem finding này' : 'Chỉ hiện BBox của riêng finding này'}
                className={`p-1.5 rounded-md border transition-colors ${
                  isSolo
                    ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--accent-text)]'
                    : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleVisibility}
                title={isHidden ? 'Hiện BBox của finding này' : 'Ẩn BBox của finding này'}
                className={`p-1.5 rounded-md border transition-colors ${
                  isHidden
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                    : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-primary)]'
                }`}
              >
                {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <p className="text-[13.5px] leading-snug font-medium text-[var(--text-primary)]">
            {finding.findingText}
          </p>

          <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {finding.boxes.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/35">
                Chưa có khung — Cần vẽ tay
              </span>
            ) : (
              finding.boxes.map((b, bIdx) => {
                const boxSelected =
                  selectedBox?.findingId === finding.id && selectedBox?.boxIndex === bIdx;
                return (
                  <div
                    key={bIdx}
                    className={`inline-flex items-center rounded-md border text-[11px] font-mono transition-colors ${
                      boxSelected
                        ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--accent-text)]'
                        : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect();
                        onSelectBox({ findingId: finding.id, boxIndex: bIdx });
                      }}
                      title={`[${b.map((n) => n.toFixed(3)).join(', ')}]`}
                      className="px-2 py-1 flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-xs"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>Box {bIdx + 1}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBox(bIdx)}
                      title="Xóa box này"
                      className="pr-1.5 pl-0.5 py-1 text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={onStartDraw}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:opacity-90 transition-opacity"
            >
              <SquarePlus className="w-3 h-3" />
              Vẽ box
            </button>

            {isModified && (
              <button
                type="button"
                onClick={onResetOriginal}
                title="Khôi phục về BBox gốc trong CSV"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-control)] text-[var(--text-secondary)] border border-[var(--border-main)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Box gốc
              </button>
            )}
          </div>

          <div
            className="pt-1.5 border-t border-[var(--border-main)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onVerify(isVerified ? 'pending' : 'verified')}
              className={`w-full h-8 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                isVerified
                  ? 'bg-emerald-500/18 border-emerald-500/55 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'bg-[var(--bg-control)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-emerald-500/45 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isVerified ? 'Đã xác nhận phù hợp' : 'Xác nhận phù hợp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FindingsPanel({
  width,
  imageId,
  findings,
  activeFindingId,
  selectedBox,
  hiddenFindingIds,
  soloFindingId,
  onSelectFinding,
  onSelectBox,
  onStartDrawForFinding,
  onDeleteBox,
  onResetBoxesToOriginal,
  onToggleVisibility,
  onShowAllFindings,
  onHideAllFindings,
  onToggleSolo,
  onVerifyFinding,
  onVerifyAllAndNext,
  hasNextCase,
}: FindingsPanelProps) {
  const verifiedCount = findings.filter((f) => f.verificationStatus === 'verified').length;
  const anyHidden = hiddenFindingIds.size > 0 || soloFindingId !== null;

  return (
    <aside
      style={{ width }}
      className="shrink-0 border-l border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-col min-h-0"
    >
      <div className="px-4 py-3 border-b border-[var(--border-main)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              Reference Findings
            </h2>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)]">
              {verifiedCount}/{findings.length}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
            Ca <span className="font-mono text-[var(--text-secondary)]">{imageId}</span> · Màu badge trùng màu BBox
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {anyHidden ? (
            <button
              type="button"
              onClick={onShowAllFindings}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Hiện tất cả
            </button>
          ) : (
            <button
              type="button"
              onClick={onHideAllFindings}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[var(--bg-control)] text-[var(--text-secondary)] border border-[var(--border-main)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <EyeOff className="w-3 h-3" />
              Ẩn hết
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {findings.map((f) => (
          <FindingCard
            key={f.id}
            finding={f}
            isActive={f.id === activeFindingId}
            isHidden={soloFindingId !== null ? soloFindingId !== f.id : hiddenFindingIds.has(f.id)}
            isSolo={soloFindingId === f.id}
            selectedBox={selectedBox}
            onSelect={() => onSelectFinding(f.id)}
            onSelectBox={onSelectBox}
            onStartDraw={() => onStartDrawForFinding(f.id)}
            onDeleteBox={(boxIdx) => onDeleteBox(f.id, boxIdx)}
            onResetOriginal={() => onResetBoxesToOriginal(f.id)}
            onToggleVisibility={() => onToggleVisibility(f.id)}
            onToggleSolo={() => onToggleSolo(f.id)}
            onVerify={(status) => onVerifyFinding(f.id, status)}
          />
        ))}
      </div>

      <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-subpanel)]">
        <button
          type="button"
          onClick={onVerifyAllAndNext}
          className="w-full h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <CheckCheck className="w-4 h-4" />
          <span>
            {hasNextCase
              ? 'Xác nhận tất cả phù hợp & Sang ca tiếp'
              : 'Xác nhận tất cả phù hợp'}
          </span>
          {hasNextCase && <ArrowRight className="w-4 h-4" />}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-[var(--text-muted)]">
          Phím tắt nhanh: <kbd className="font-mono">Ctrl + Enter</kbd>
        </p>
      </div>
    </aside>
  );
}
