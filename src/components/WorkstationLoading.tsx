export function WorkstationLoading() {
  return (
    <div className="h-dvh w-full bg-[var(--bg-app)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
        <p className="text-xs font-mono text-[var(--text-secondary)]">
          Đang tải dữ liệu ViX-Ray...
        </p>
      </div>
    </div>
  );
}
