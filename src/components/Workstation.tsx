'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getXrayImageSrc } from '@/lib/imageUrl';
import type {
  BoundingBox,
  DatasetPayload,
  ReferenceFinding,
  VerificationStatus,
  XrayCase,
} from '@/lib/types';
import { CaseSidebar, getCaseSummary, type CaseFilter } from './CaseSidebar';
import { FindingsPanel } from './FindingsPanel';
import { ResizeDivider } from './ResizeDivider';
import { ShortcutsModal } from './ShortcutsModal';
import { WorkstationHeader } from './WorkstationHeader';
import { XrayCanvas, type CanvasTool, type SelectedBoxRef } from './XrayCanvas';

interface HistoryEntry {
  findingId: string;
  prevBoxes: BoundingBox[];
  nextBoxes: BoundingBox[];
}

interface WorkstationProps {
  initialData: DatasetPayload;
  initialImageId?: string | null;
}

const LEFT_MIN = 190;
const LEFT_MAX = 420;
const RIGHT_MIN = 280;
const RIGHT_MAX = 560;

export function Workstation({ initialData, initialImageId }: WorkstationProps) {
  const resolvedInitialCase =
    initialData.cases.find((c) => c.imageId === initialImageId) ??
    initialData.cases[0] ??
    null;

  const [cases, setCases] = useState<XrayCase[]>(initialData.cases);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    resolvedInitialCase?.imageId ?? null
  );
  const [filter, setFilter] = useState<CaseFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(268);
  const [rightWidth, setRightWidth] = useState(380);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [activeFindingId, setActiveFindingId] = useState<string | null>(
    resolvedInitialCase?.findings[0]?.id ?? null
  );
  const [selectedBox, setSelectedBox] = useState<SelectedBoxRef | null>(null);
  const [hiddenFindingIds, setHiddenFindingIds] = useState<Set<string>>(() => new Set());
  const [soloFindingId, setSoloFindingId] = useState<string | null>(null);

  const [tool, setTool] = useState<CanvasTool>('select');
  const [showAllBoxes, setShowAllBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGhostOriginal, setShowGhostOriginal] = useState(false);
  const [invertImage, setInvertImage] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [saveError, setSaveError] = useState(false);
  const pendingSavesRef = useRef(0);

  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const dragStartBoxesRef = useRef<Map<string, BoundingBox[]>>(new Map());

  useEffect(() => {
    const saved = window.localStorage.getItem('vixray-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(saved);
      if (saved !== 'light') {
        queueMicrotask(() => setTheme(saved));
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(next);
      window.localStorage.setItem('vixray-theme', next);
      return next;
    });
  }, []);

  const startResize = useCallback(
    (side: 'left' | 'right', e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const initialWidth = side === 'left' ? leftWidth : rightWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        if (side === 'left') {
          setLeftWidth(Math.max(LEFT_MIN, Math.min(LEFT_MAX, initialWidth + delta)));
        } else {
          setRightWidth(Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, initialWidth - delta)));
        }
      };

      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [leftWidth, rightWidth]
  );

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => {
      if (q) {
        const hitId = c.imageId.toLowerCase().includes(q);
        const hitText = c.findings.some(
          (f) => f.findingText.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
        );
        if (!hitId && !hitText) return false;
      }

      if (filter === 'all') return true;
      const s = getCaseSummary(c);
      if (filter === 'pending') return !s.allVerified;
      if (filter === 'manual') return s.manual > 0;
      if (filter === 'verified') return s.allVerified;
      return true;
    });
  }, [cases, filter, searchQuery]);

  const currentCase = useMemo(
    () => cases.find((c) => c.imageId === selectedImageId) ?? filteredCases[0] ?? cases[0] ?? null,
    [cases, filteredCases, selectedImageId]
  );

  const currentFilteredIndex = useMemo(() => {
    if (!currentCase) return -1;
    return filteredCases.findIndex((c) => c.imageId === currentCase.imageId);
  }, [currentCase, filteredCases]);

  const stats = useMemo(() => {
    let total = 0;
    let verified = 0;
    for (const c of cases) {
      for (const f of c.findings) {
        total++;
        if (f.verificationStatus === 'verified') verified++;
      }
    }
    return { total, verified };
  }, [cases]);

  useEffect(() => {
    if (currentFilteredIndex < 0) return;
    const targets = [
      filteredCases[currentFilteredIndex + 1],
      filteredCases[currentFilteredIndex + 2],
    ].filter(Boolean);
    for (const target of targets) {
      const img = new window.Image();
      img.src = getXrayImageSrc(target.imageId);
    }
  }, [currentFilteredIndex, filteredCases]);

  const selectCase = useCallback(
    (imageId: string, pushUrl = true) => {
      setSelectedImageId(imageId);
      setSelectedBox(null);
      setSoloFindingId(null);
      setHiddenFindingIds(new Set());
      const next = cases.find((c) => c.imageId === imageId);
      setActiveFindingId(next?.findings[0]?.id ?? null);
      if (pushUrl) {
        const targetPath = `/case/${encodeURIComponent(imageId)}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState(null, '', targetPath);
        }
      }
    },
    [cases]
  );

  useEffect(() => {
    if (selectedImageId && window.location.pathname === '/') {
      window.history.replaceState(null, '', `/case/${encodeURIComponent(selectedImageId)}`);
    }
  }, [selectedImageId]);

  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/case\/([^/]+)/);
      if (!match) return;
      const id = decodeURIComponent(match[1]);
      if (cases.some((c) => c.imageId === id)) {
        selectCase(id, false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [cases, selectCase]);

  const goPrevCase = useCallback(() => {
    if (filteredCases.length === 0) return;
    const idx = currentFilteredIndex > 0 ? currentFilteredIndex - 1 : 0;
    selectCase(filteredCases[idx].imageId);
  }, [currentFilteredIndex, filteredCases, selectCase]);

  const goNextCase = useCallback(() => {
    if (filteredCases.length === 0) return;
    const idx =
      currentFilteredIndex >= 0 && currentFilteredIndex < filteredCases.length - 1
        ? currentFilteredIndex + 1
        : filteredCases.length - 1;
    selectCase(filteredCases[idx].imageId);
  }, [currentFilteredIndex, filteredCases, selectCase]);

  const runSaveRequest = useCallback(async (request: () => Promise<Response>) => {
    pendingSavesRef.current += 1;
    setSaveError(false);
    try {
      const res = await request();
      if (!res.ok) throw new Error('Request failed');
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
    } catch {
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      setSaveError(true);
    }
  }, []);

  const persistFinding = useCallback(
    (
      findingId: string,
      patch: {
        boxes?: BoundingBox[];
        verificationStatus?: VerificationStatus;
      }
    ) =>
      runSaveRequest(() =>
        fetch(`/api/findings/${encodeURIComponent(findingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
      ),
    [runSaveRequest]
  );

  const patchFindingLocal = useCallback(
    (findingId: string, updater: (f: ReferenceFinding) => ReferenceFinding) => {
      setCases((prev) =>
        prev.map((c) =>
          c.findings.some((f) => f.id === findingId)
            ? { ...c, findings: c.findings.map((f) => (f.id === findingId ? updater(f) : f)) }
            : c
        )
      );
    },
    []
  );

  const pushHistory = useCallback(
    (findingId: string, prevBoxes: BoundingBox[], nextBoxes: BoundingBox[]) => {
      setUndoStack((prev) => [
        ...prev.slice(-39),
        {
          findingId,
          prevBoxes: prevBoxes.map((b) => [...b] as BoundingBox),
          nextBoxes: nextBoxes.map((b) => [...b] as BoundingBox),
        },
      ]);
      setRedoStack([]);
    },
    []
  );

  const applyBoxEdit = useCallback(
    (findingId: string, nextBoxes: BoundingBox[]) => {
      const target = currentCase?.findings.find((f) => f.id === findingId);
      if (!target) return;
      const prevBoxes = target.boxes.map((b) => [...b] as BoundingBox);
      patchFindingLocal(findingId, (f) => ({
        ...f,
        boxes: nextBoxes,
        updatedAt: new Date().toISOString(),
      }));
      pushHistory(findingId, prevBoxes, nextBoxes);
      void persistFinding(findingId, { boxes: nextBoxes });
    },
    [currentCase, patchFindingLocal, persistFinding, pushHistory]
  );

  const handleUpdateBox = useCallback(
    (findingId: string, boxIndex: number, nextBox: BoundingBox, commit: boolean) => {
      const currentFinding = currentCase?.findings.find((f) => f.id === findingId);
      if (!currentFinding) return;

      if (!dragStartBoxesRef.current.has(findingId)) {
        dragStartBoxesRef.current.set(
          findingId,
          currentFinding.boxes.map((b) => [...b] as BoundingBox)
        );
      }

      const latestBoxes = currentFinding.boxes.map((b, i) => (i === boxIndex ? nextBox : b));

      patchFindingLocal(findingId, (f) => ({
        ...f,
        boxes: f.boxes.map((b, i) => (i === boxIndex ? nextBox : b)),
        updatedAt: new Date().toISOString(),
      }));

      if (commit) {
        const prevBoxes = dragStartBoxesRef.current.get(findingId);
        dragStartBoxesRef.current.delete(findingId);
        if (prevBoxes) pushHistory(findingId, prevBoxes, latestBoxes);
        void persistFinding(findingId, { boxes: latestBoxes });
      }
    },
    [currentCase, patchFindingLocal, persistFinding, pushHistory]
  );

  const handleAddBox = useCallback(
    (findingId: string, newBox: BoundingBox) => {
      const target = currentCase?.findings.find((f) => f.id === findingId);
      if (!target) return;
      const nextBoxes = [...target.boxes.map((b) => [...b] as BoundingBox), newBox];
      applyBoxEdit(findingId, nextBoxes);
      setSelectedBox({ findingId, boxIndex: nextBoxes.length - 1 });
      setTool('select');
    },
    [applyBoxEdit, currentCase]
  );

  const handleDeleteBox = useCallback(
    (findingId: string, boxIndex: number) => {
      const target = currentCase?.findings.find((f) => f.id === findingId);
      if (!target) return;
      applyBoxEdit(
        findingId,
        target.boxes.filter((_, i) => i !== boxIndex)
      );
      setSelectedBox(null);
    },
    [applyBoxEdit, currentCase]
  );

  const handleResetBoxesToOriginal = useCallback(
    (findingId: string) => {
      const target = currentCase?.findings.find((f) => f.id === findingId);
      if (!target) return;
      applyBoxEdit(
        findingId,
        target.originalBoxes.map((b) => [...b] as BoundingBox)
      );
      setSelectedBox(null);
    },
    [applyBoxEdit, currentCase]
  );

  const handleVerifyFinding = useCallback(
    (findingId: string, status: VerificationStatus) => {
      patchFindingLocal(findingId, (f) => ({
        ...f,
        verificationStatus: status,
        updatedAt: new Date().toISOString(),
      }));
      void persistFinding(findingId, { verificationStatus: status });
    },
    [patchFindingLocal, persistFinding]
  );

  const handleVerifyAllAndNext = useCallback(async () => {
    if (!currentCase) return;
    const targetImageId = currentCase.imageId;
    const nowIso = new Date().toISOString();

    setCases((prev) =>
      prev.map((c) =>
        c.imageId === targetImageId
          ? {
              ...c,
              findings: c.findings.map((f) => ({
                ...f,
                verificationStatus: 'verified',
                updatedAt: nowIso,
              })),
            }
          : c
      )
    );

    if (currentFilteredIndex >= 0 && currentFilteredIndex < filteredCases.length - 1) {
      selectCase(filteredCases[currentFilteredIndex + 1].imageId);
    }

    await runSaveRequest(() =>
      fetch(`/api/cases/${encodeURIComponent(targetImageId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'verified' }),
      })
    );
  }, [currentCase, currentFilteredIndex, filteredCases, runSaveRequest, selectCase]);

  const stepHistory = useCallback(
    (direction: 'undo' | 'redo') => {
      const source = direction === 'undo' ? undoStack : redoStack;
      if (source.length === 0) return;

      const entry = source[source.length - 1];
      const boxesToApply = direction === 'undo' ? entry.prevBoxes : entry.nextBoxes;

      if (direction === 'undo') {
        setUndoStack((s) => s.slice(0, -1));
        setRedoStack((s) => [...s, entry]);
      } else {
        setRedoStack((s) => s.slice(0, -1));
        setUndoStack((s) => [...s, entry]);
      }

      patchFindingLocal(entry.findingId, (f) => ({
        ...f,
        boxes: boxesToApply,
        updatedAt: new Date().toISOString(),
      }));
      setSelectedBox(null);
      void persistFinding(entry.findingId, { boxes: boxesToApply });
    },
    [patchFindingLocal, persistFinding, redoStack, undoStack]
  );

  const handleToggleVisibility = useCallback((findingId: string) => {
    setSoloFindingId(null);
    setHiddenFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      return next;
    });
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        stepHistory(e.shiftKey ? 'redo' : 'undo');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleVerifyAllAndNext();
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      if (e.key === 'Escape') {
        if (shortcutsOpen) setShortcutsOpen(false);
        else if (tool === 'draw') setTool('select');
        else setSelectedBox(null);
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower === 'v') setTool('select');
      else if (lower === 'b') setTool('draw');
      else if (lower === 'h') setTool('pan');
      else if (lower === 'g') setShowGhostOriginal((v) => !v);
      else if (lower === 'l') setShowLabels((v) => !v);
      else if (lower === 'i') setInvertImage((v) => !v);
      else if (e.key === '[') goPrevCase();
      else if (e.key === ']') goNextCase();
      else if (e.key === 'ArrowUp' && currentCase) {
        e.preventDefault();
        const idx = currentCase.findings.findIndex((f) => f.id === activeFindingId);
        const prevIdx = idx > 0 ? idx - 1 : currentCase.findings.length - 1;
        if (currentCase.findings[prevIdx]) setActiveFindingId(currentCase.findings[prevIdx].id);
      } else if (e.key === 'ArrowDown' && currentCase) {
        e.preventDefault();
        const idx = currentCase.findings.findIndex((f) => f.id === activeFindingId);
        const nextIdx = idx < currentCase.findings.length - 1 ? idx + 1 : 0;
        if (currentCase.findings[nextIdx]) setActiveFindingId(currentCase.findings[nextIdx].id);
      } else if (e.key === '1' && activeFindingId) {
        handleVerifyFinding(activeFindingId, 'verified');
      } else if (e.key === '3' && activeFindingId) {
        handleToggleVisibility(activeFindingId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBox) {
        e.preventDefault();
        handleDeleteBox(selectedBox.findingId, selectedBox.boxIndex);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeFindingId,
    currentCase,
    goNextCase,
    goPrevCase,
    handleDeleteBox,
    handleToggleVisibility,
    handleVerifyAllAndNext,
    handleVerifyFinding,
    selectedBox,
    shortcutsOpen,
    stepHistory,
    tool,
  ]);

  return (
    <div className="h-dvh w-full flex flex-col bg-[var(--bg-app)] overflow-hidden">
      <WorkstationHeader
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        theme={theme}
        currentImageId={currentCase?.imageId ?? null}
        currentIndex={currentFilteredIndex}
        totalFilteredCases={filteredCases.length}
        verifiedFindings={stats.verified}
        totalFindings={stats.total}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        saveError={saveError}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
        onToggleTheme={toggleTheme}
        onPrevCase={goPrevCase}
        onNextCase={goNextCase}
        onUndo={() => stepHistory('undo')}
        onRedo={() => stepHistory('redo')}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {leftOpen && (
          <>
            <CaseSidebar
              width={leftWidth}
              cases={cases}
              filteredCases={filteredCases}
              selectedImageId={currentCase?.imageId ?? null}
              filter={filter}
              searchQuery={searchQuery}
              onFilterChange={setFilter}
              onSearchChange={setSearchQuery}
              onSelectCase={selectCase}
            />
            <ResizeDivider onPointerDown={(e) => startResize('left', e)} />
          </>
        )}

        {currentCase ? (
          <>
            <XrayCanvas
              key={currentCase.imageId}
              imageId={currentCase.imageId}
              findings={currentCase.findings}
              activeFindingId={activeFindingId}
              selectedBox={selectedBox}
              hiddenFindingIds={hiddenFindingIds}
              soloFindingId={soloFindingId}
              tool={tool}
              showAllBoxes={showAllBoxes}
              showLabels={showLabels}
              showGhostOriginal={showGhostOriginal}
              invertImage={invertImage}
              brightness={brightness}
              contrast={contrast}
              onToolChange={setTool}
              onSelectBox={setSelectedBox}
              onSelectFinding={setActiveFindingId}
              onUpdateBox={handleUpdateBox}
              onAddBox={handleAddBox}
              onDeleteBox={handleDeleteBox}
              onToggleShowAllBoxes={() => setShowAllBoxes((v) => !v)}
              onToggleLabels={() => setShowLabels((v) => !v)}
              onToggleGhostOriginal={() => setShowGhostOriginal((v) => !v)}
              onToggleInvert={() => setInvertImage((v) => !v)}
              onBrightnessChange={setBrightness}
              onContrastChange={setContrast}
              onResetEnhancements={() => {
                setBrightness(100);
                setContrast(100);
                setInvertImage(false);
              }}
            />

            {rightOpen && (
              <>
                <ResizeDivider onPointerDown={(e) => startResize('right', e)} />
                <FindingsPanel
                  width={rightWidth}
                  imageId={currentCase.imageId}
                  findings={currentCase.findings}
                  activeFindingId={activeFindingId}
                  selectedBox={selectedBox}
                  hiddenFindingIds={hiddenFindingIds}
                  soloFindingId={soloFindingId}
                  onSelectFinding={setActiveFindingId}
                  onSelectBox={(ref) => {
                    setSelectedBox(ref);
                    setTool('select');
                  }}
                  onStartDrawForFinding={(findingId) => {
                    setActiveFindingId(findingId);
                    setShowAllBoxes(true);
                    setHiddenFindingIds((prev) => {
                      const next = new Set(prev);
                      next.delete(findingId);
                      return next;
                    });
                    setTool('draw');
                  }}
                  onDeleteBox={handleDeleteBox}
                  onResetBoxesToOriginal={handleResetBoxesToOriginal}
                  onToggleVisibility={handleToggleVisibility}
                  onShowAllFindings={() => {
                    setShowAllBoxes(true);
                    setSoloFindingId(null);
                    setHiddenFindingIds(new Set());
                  }}
                  onHideAllFindings={() => {
                    setSoloFindingId(null);
                    setHiddenFindingIds(new Set(currentCase.findings.map((f) => f.id)));
                  }}
                  onToggleSolo={(findingId) => {
                    setShowAllBoxes(true);
                    setSoloFindingId((prev) => (prev === findingId ? null : findingId));
                  }}
                  onVerifyFinding={handleVerifyFinding}
                  onVerifyAllAndNext={handleVerifyAllAndNext}
                  hasNextCase={
                    currentFilteredIndex >= 0 && currentFilteredIndex < filteredCases.length - 1
                  }
                />
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">
            Không tìm thấy dữ liệu trong thư mục <code className="mx-1 font-mono">data/</code>.
          </div>
        )}
      </div>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
