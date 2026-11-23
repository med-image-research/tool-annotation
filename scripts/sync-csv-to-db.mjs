import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const CSV_PATH = path.join(process.cwd(), 'data', 'ViX-Ray_PreAnnotated.csv');
const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'annotations-store.json');

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  for (const envFile of ['.env.local', '.env']) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), envFile), 'utf-8');
      for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
        if (match) return match[1].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
    }
  }
  throw new Error('DATABASE_URL not found in environment or .env.local');
}

function parseCsvRows(content) {
  const text = content.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
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
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
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

function normalizeBox(raw) {
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

function parseBoxes(raw) {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeBox).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseCsvRecords(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);

  const iId = idx('reference_finding_id');
  const iImg = idx('image_id');
  const iUrl = idx('image_url');
  const iText = idx('finding_text');
  const iStatus = idx('status');
  const iBoxes = idx('boxes');
  const iUpdated = idx('updated_at');
  const iPrior = idx('impression_relevance_prior');
  const iVerify = idx('verification_status');
  const iNote = idx('doctor_note');

  const perImageCount = new Map();
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const id = (cols[iId] ?? '').trim();
    const imageId = (cols[iImg] ?? '').trim();
    if (!id || !imageId) continue;

    const count = perImageCount.get(imageId) ?? 0;
    perImageCount.set(imageId, count + 1);
    const rfMatch = id.match(/-RF(\d+)$/i);
    const rfNum = rfMatch ? Number.parseInt(rfMatch[1], 10) : count + 1;
    const boxes = parseBoxes(cols[iBoxes]);
    const rawVerify = (iVerify >= 0 ? cols[iVerify] : '')?.trim().toLowerCase();

    records.push({
      id,
      image_id: imageId,
      rf_label: `RF${rfNum}`,
      rf_index: Math.max(0, rfNum - 1),
      image_url: (cols[iUrl] ?? '').trim(),
      finding_text: (cols[iText] ?? '').trim(),
      csv_status: (cols[iStatus] ?? 'Pre-annotated').trim(),
      boxes,
      original_boxes: boxes,
      verification_status: rawVerify === 'verified' ? 'verified' : 'pending',
      doctor_note: (iNote >= 0 ? cols[iNote] : '')?.trim() ?? '',
      impression_relevance_prior:
        (cols[iPrior] ?? '').trim().toLowerCase() === 'no' ? 'no' : 'yes',
      updated_at: (cols[iUpdated] ?? '').trim() || new Date().toISOString(),
    });
  }

  return records;
}

async function main() {
  const databaseUrl = await loadDatabaseUrl();
  const csvText = await fs.readFile(CSV_PATH, 'utf-8');
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    throw new Error('CSV contains no valid rows');
  }

  const sql = neon(databaseUrl);
  const payload = JSON.stringify(records);
  const ids = records.map((r) => r.id);

  await sql`
    INSERT INTO reference_findings (
      id, image_id, rf_label, rf_index, image_url, finding_text,
      csv_status, boxes, original_boxes, verification_status,
      doctor_note, impression_relevance_prior, updated_at
    )
    SELECT
      x.id, x.image_id, x.rf_label, x.rf_index, x.image_url, x.finding_text,
      x.csv_status, x.boxes, x.original_boxes, x.verification_status,
      x.doctor_note, x.impression_relevance_prior, x.updated_at::timestamptz
    FROM jsonb_to_recordset(${payload}::jsonb) AS x(
      id text, image_id text, rf_label text, rf_index int, image_url text,
      finding_text text, csv_status text, boxes jsonb, original_boxes jsonb,
      verification_status text, doctor_note text, impression_relevance_prior text,
      updated_at text
    )
    ON CONFLICT (id) DO UPDATE SET
      image_id = EXCLUDED.image_id,
      rf_label = EXCLUDED.rf_label,
      rf_index = EXCLUDED.rf_index,
      image_url = EXCLUDED.image_url,
      finding_text = EXCLUDED.finding_text,
      csv_status = EXCLUDED.csv_status,
      boxes = EXCLUDED.boxes,
      original_boxes = EXCLUDED.original_boxes,
      verification_status = EXCLUDED.verification_status,
      doctor_note = EXCLUDED.doctor_note,
      impression_relevance_prior = EXCLUDED.impression_relevance_prior,
      updated_at = EXCLUDED.updated_at
  `;

  await sql`DELETE FROM reference_findings WHERE NOT (id = ANY(${ids}::text[]))`;
  await fs.rm(LOCAL_STORE_PATH, { force: true });

  const [{ cnt }] = await sql`SELECT COUNT(*)::int AS cnt FROM reference_findings`;
  console.log(`Synced ${records.length} CSV rows to Neon PostgreSQL (table count: ${cnt}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
