import type { BoundingBox, ReferenceFinding, VerificationStatus } from './types';

function parseCsvRows(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export function normalizeBox(raw: number[]): BoundingBox | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const nums = raw.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const x1 = Math.max(0, Math.min(1, Math.min(nums[0], nums[2])));
  const y1 = Math.max(0, Math.min(1, Math.min(nums[1], nums[3])));
  const x2 = Math.max(0, Math.min(1, Math.max(nums[0], nums[2])));
  const y2 = Math.max(0, Math.min(1, Math.max(nums[1], nums[3])));
  if (x2 - x1 <= 0.001 || y2 - y1 <= 0.001) return null;
  return [
    Number(x1.toFixed(4)),
    Number(y1.toFixed(4)),
    Number(x2.toFixed(4)),
    Number(y2.toFixed(4)),
  ];
}

export function parseBoxesField(raw: string | undefined): BoundingBox[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeBox(item))
      .filter((b): b is BoundingBox => b !== null);
  } catch {
    return [];
  }
}

function parseRfLabel(id: string, fallbackIdx: number): { label: string; index: number } {
  const match = id.match(/-RF(\d+)$/i);
  if (match) {
    const num = Number.parseInt(match[1], 10);
    return { label: `RF${num}`, index: Math.max(0, num - 1) };
  }
  return { label: `RF${fallbackIdx + 1}`, index: fallbackIdx };
}

export function parsePreAnnotatedCsv(csvText: string): ReferenceFinding[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  const iId = idx('reference_finding_id');
  const iImg = idx('image_id');
  const iUrl = idx('image_url');
  const iText = idx('finding_text');
  const iStatus = idx('status');
  const iBoxes = idx('boxes');
  const iUpdated = idx('updated_at');
  const iPrior = idx('impression_relevance_prior');
  const iVerify = idx('verification_status');

  const perImageCount = new Map<string, number>();
  const findings: ReferenceFinding[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const id = (cols[iId] ?? '').trim();
    const imageId = (cols[iImg] ?? '').trim();
    if (!id || !imageId) continue;

    const count = perImageCount.get(imageId) ?? 0;
    perImageCount.set(imageId, count + 1);

    const rf = parseRfLabel(id, count);
    const boxes = parseBoxesField(cols[iBoxes]);
    const rawVerify = (iVerify >= 0 ? cols[iVerify] : '')?.trim().toLowerCase();
    const verificationStatus: VerificationStatus =
      rawVerify === 'verified' ? 'verified' : 'pending';

    findings.push({
      id,
      imageId,
      rfLabel: rf.label,
      rfIndex: rf.index,
      imageUrl: (cols[iUrl] ?? '').trim(),
      findingText: (cols[iText] ?? '').trim(),
      csvStatus: (cols[iStatus] ?? 'Pre-annotated').trim(),
      boxes,
      originalBoxes: boxes.map((b) => [...b] as BoundingBox),
      verificationStatus,
      impressionRelevancePrior:
        (cols[iPrior] ?? '').trim().toLowerCase() === 'no' ? 'no' : 'yes',
      updatedAt: (cols[iUpdated] ?? '').trim() || new Date().toISOString(),
    });
  }

  return findings;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function boxesEqual(a: BoundingBox[], b: BoundingBox[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < 4; j++) {
      if (Math.abs(a[i][j] - b[i][j]) > 0.0002) return false;
    }
  }
  return true;
}

export function serializeFindingsToCsv(findings: ReferenceFinding[]): string {
  const headers = [
    'reference_finding_id',
    'image_id',
    'image_url',
    'finding_text',
    'status',
    'boxes',
    'updated_at',
    'impression_relevance_prior',
    'verification_status',
    'boxes_modified',
  ];

  const lines = [headers.join(',')];

  for (const f of findings) {
    const modified = !boxesEqual(f.boxes, f.originalBoxes);
    const effectiveStatus =
      f.verificationStatus === 'verified'
        ? modified
          ? 'Verified_Adjusted'
          : 'Verified'
        : f.boxes.length === 0
          ? 'Manual_Required'
          : modified
            ? 'Adjusted'
            : f.csvStatus;

    const boxesJson = f.boxes.length > 0 ? JSON.stringify(f.boxes) : '';

    const cells = [
      f.id,
      f.imageId,
      f.imageUrl,
      f.findingText,
      effectiveStatus,
      boxesJson,
      f.updatedAt,
      f.impressionRelevancePrior,
      f.verificationStatus,
      modified ? 'yes' : 'no',
    ].map(escapeCsvCell);

    lines.push(cells.join(','));
  }

  return '\uFEFF' + lines.join('\r\n');
}
