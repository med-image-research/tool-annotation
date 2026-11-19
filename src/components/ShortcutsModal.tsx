'use client';

import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Cuộn chuột', desc: 'Phóng to / Thu nhỏ tại đúng vị trí con trỏ' },
  { keys: 'Giữ Space + Kéo', desc: 'Kéo di chuyển ảnh khi đang zoom lớn' },
  { keys: 'V', desc: 'Chế độ Chọn / Di chuyển / Kéo giãn BBox' },
  { keys: 'B', desc: 'Vẽ BBox mới cho Reference Finding đang chọn' },
  { keys: 'H', desc: 'Chuyển sang công cụ Kéo ảnh (Pan)' },
  { keys: '0 hoặc R', desc: 'Đưa ảnh vừa khít khung nhìn (Fit)' },
  { keys: 'I', desc: 'Đảo ngược âm bản / dương bản phim X-quang' },
  { keys: 'G', desc: 'Hiện/Ẩn viền nét đứt BBox gốc để đối chiếu' },
  { keys: 'L', desc: 'Hiện/Ẩn nhãn RF trên ảnh' },
  { keys: '1', desc: 'Đánh dấu Finding đang chọn là Phù hợp' },
  { keys: '3', desc: 'Ẩn/Hiện BBox của Finding đang chọn' },
  { keys: '↑ / ↓', desc: 'Chuyển nhanh giữa các Finding trên cùng ảnh' },
  { keys: '[ / ]', desc: 'Chuyển sang ca trước / ca tiếp theo' },
  { keys: 'Ctrl + Enter', desc: 'Xác nhận toàn bộ Finding của ca & qua ca tiếp' },
  { keys: 'Ctrl + Z / Shift+Z', desc: 'Hoàn tác / Làm lại chỉnh sửa BBox' },
  { keys: 'Delete / Backspace', desc: 'Xóa BBox đang được chọn' },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-strong)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Phím tắt thao tác nhanh cho Bác sĩ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-control)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto divide-y divide-[var(--border-main)]">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="py-2 flex items-center justify-between gap-4">
              <span className="text-xs text-[var(--text-secondary)]">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-control)] border border-[var(--border-main)] font-mono text-[11px] text-[var(--accent-text)] shrink-0">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
