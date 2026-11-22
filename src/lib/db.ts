import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { normalizeBox, parsePreAnnotatedCsv } from './csv';
import type {
  BoundingBox,
  DatasetPayload,
  ReferenceFinding,
  VerificationStatus,
  XrayCase,
} from './types';

const CSV_PATH = path.join(process.cwd(), 'data', 'ViX-Ray_PreAnnotated.csv');
const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'annotations-store.json');

let neonReadyPromise: Promise<void> | null = null;
let localWriteChain: Promise<void> = Promise.resolve();

function hasNeonDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

async function readSeedCsv(): Promise<ReferenceFinding[]> {
  const raw = await fs.readFile(CSV_PATH, 'utf-8');
  return parsePreAnnotatedCsv(raw);
}

/**
 * Lazily initializes the Neon PostgreSQL schema and seeds initial rows from CSV
 * in a single roundtrip when the table is empty.
 */
async function ensureNeonInitialized(): Promise<void> {
  if (!neonReadyPromise) {
    neonReadyPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS reference_findings (
          id TEXT PRIMARY KEY,
          image_id TEXT NOT NULL,
          rf_label TEXT NOT NULL,
          rf_index INTEGER NOT NULL DEFAULT 0,
          image_url TEXT NOT NULL DEFAULT '',
          finding_text TEXT NOT NULL,
          csv_status TEXT NOT NULL DEFAULT 'Pre-annotated',
          boxes JSONB NOT NULL DEFAULT '[]'::jsonb,
          original_boxes JSONB NOT NULL DEFAULT '[]'::jsonb,
          verification_status TEXT NOT NULL DEFAULT 'pending',
          doctor_note TEXT NOT NULL DEFAULT '',
          impression_relevance_prior TEXT NOT NULL DEFAULT 'yes',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE reference_findings
        ADD COLUMN IF NOT EXISTS doctor_note TEXT NOT NULL DEFAULT ''
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_reference_findings_image_id
        ON reference_findings (image_id, rf_index)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_reference_findings_status
        ON reference_findings (verification_status)
      `;

      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM reference_findings`;
      if (Number(countRows[0]?.cnt ?? 0) === 0) {
        const seed = await readSeedCsv();
        if (seed.length > 0) {
          const payload = JSON.stringify(
            seed.map((f) => ({
              id: f.id,
              image_id: f.imageId,
              rf_label: f.rfLabel,
              rf_index: f.rfIndex,
              image_url: f.imageUrl,
              finding_text: f.findingText,
              csv_status: f.csvStatus,
              boxes: f.boxes,
              original_boxes: f.originalBoxes,
              verification_status: f.verificationStatus,
              doctor_note: f.doctorNote,
              impression_relevance_prior: f.impressionRelevancePrior,
              updated_at: f.updatedAt,
            }))
          );
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
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }
    })().catch((err) => {
      neonReadyPromise = null;
      throw err;
    });
  }
  return neonReadyPromise;
}

function mapDbRow(row: Record<string, unknown>): ReferenceFinding {
  const parseJsonBoxes = (val: unknown): BoundingBox[] => {
    const arr = typeof val === 'string' ? JSON.parse(val) : val;
    if (!Array.isArray(arr)) return [];
    return arr.map((b) => normalizeBox(b)).filter((b): b is BoundingBox => b !== null);
  };

  const verificationStatus: VerificationStatus =
    String(row.verification_status) === 'verified' ? 'verified' : 'pending';

  return {
    id: String(row.id),
    imageId: String(row.image_id),
    rfLabel: String(row.rf_label),
    rfIndex: Number(row.rf_index ?? 0),
    imageUrl: String(row.image_url ?? ''),
    findingText: String(row.finding_text ?? ''),
    csvStatus: String(row.csv_status ?? 'Pre-annotated'),
    boxes: parseJsonBoxes(row.boxes),
    originalBoxes: parseJsonBoxes(row.original_boxes),
    verificationStatus,
    doctorNote: String(row.doctor_note ?? ''),
    impressionRelevancePrior: String(row.impression_relevance_prior) === 'no' ? 'no' : 'yes',
    updatedAt: row.updated_at
      ? new Date(String(row.updated_at)).toISOString()
      : new Date().toISOString(),
  };
}

async function readLocalFindings(): Promise<ReferenceFinding[]> {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return (parsed as ReferenceFinding[]).map((f) => ({
        ...f,
        doctorNote: typeof f.doctorNote === 'string' ? f.doctorNote : '',
      }));
    }
  } catch {
  }

  const seed = await readSeedCsv();
  try {
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
  } catch {
  }
  return seed;
}

/**
 * Serializes writes via an atomic temp-file rename so concurrent PATCH requests
 * never corrupt the local JSON store.
 */
async function writeLocalFindings(findings: ReferenceFinding[]): Promise<void> {
  localWriteChain = localWriteChain.then(async () => {
    const tmpPath = `${LOCAL_STORE_PATH}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(findings, null, 2), 'utf-8');
    await fs.rename(tmpPath, LOCAL_STORE_PATH);
  });
  return localWriteChain;
}

export async function getAllFindings(): Promise<ReferenceFinding[]> {
  if (hasNeonDatabase()) {
    await ensureNeonInitialized();
    const sql = getSql();
    const rows = await sql`
      SELECT id, image_id, rf_label, rf_index, image_url, finding_text,
             csv_status, boxes, original_boxes, verification_status,
             doctor_note, impression_relevance_prior, updated_at
      FROM reference_findings
      ORDER BY image_id ASC, rf_index ASC, id ASC
    `;
    return rows.map((r) => mapDbRow(r as Record<string, unknown>));
  }

  const findings = await readLocalFindings();
  findings.sort((a, b) =>
    a.imageId !== b.imageId
      ? a.imageId.localeCompare(b.imageId)
      : a.rfIndex - b.rfIndex || a.id.localeCompare(b.id)
  );
  return findings;
}

export function groupFindingsIntoCases(findings: ReferenceFinding[]): XrayCase[] {
  const map = new Map<string, XrayCase>();
  for (const f of findings) {
    let existing = map.get(f.imageId);
    if (!existing) {
      existing = { imageId: f.imageId, imageUrl: f.imageUrl, findings: [] };
      map.set(f.imageId, existing);
    }
    existing.findings.push(f);
  }
  return Array.from(map.values());
}

export async function getDatasetPayload(): Promise<DatasetPayload> {
  const findings = await getAllFindings();
  const cases = groupFindingsIntoCases(findings);
  const verifiedFindings = findings.filter((f) => f.verificationStatus === 'verified').length;

  return {
    cases,
    totalFindings: findings.length,
    verifiedFindings,
  };
}

export interface FindingPatchInput {
  boxes?: BoundingBox[];
  verificationStatus?: VerificationStatus;
  doctorNote?: string;
}

export async function updateFinding(
  id: string,
  patch: FindingPatchInput
): Promise<ReferenceFinding | null> {
  const sanitizedBoxes = patch.boxes
    ? patch.boxes.map((b) => normalizeBox(b)).filter((b): b is BoundingBox => b !== null)
    : undefined;
  const nowIso = new Date().toISOString();

  if (hasNeonDatabase()) {
    await ensureNeonInitialized();
    const sql = getSql();
    const existingRows = await sql`
      SELECT id, image_id, rf_label, rf_index, image_url, finding_text,
             csv_status, boxes, original_boxes, verification_status,
             doctor_note, impression_relevance_prior, updated_at
      FROM reference_findings
      WHERE id = ${id}
      LIMIT 1
    `;
    if (existingRows.length === 0) return null;
    const current = mapDbRow(existingRows[0] as Record<string, unknown>);

    const updatedRows = await sql`
      UPDATE reference_findings
      SET
        boxes = ${JSON.stringify(sanitizedBoxes ?? current.boxes)}::jsonb,
        verification_status = ${patch.verificationStatus ?? current.verificationStatus},
        doctor_note = ${patch.doctorNote !== undefined ? patch.doctorNote : current.doctorNote},
        updated_at = ${nowIso}::timestamptz
      WHERE id = ${id}
      RETURNING id, image_id, rf_label, rf_index, image_url, finding_text,
                csv_status, boxes, original_boxes, verification_status,
                doctor_note, impression_relevance_prior, updated_at
    `;
    return mapDbRow(updatedRows[0] as Record<string, unknown>);
  }

  const findings = await readLocalFindings();
  const targetIdx = findings.findIndex((f) => f.id === id);
  if (targetIdx === -1) return null;

  const current = findings[targetIdx];
  const updated: ReferenceFinding = {
    ...current,
    boxes: sanitizedBoxes ?? current.boxes,
    verificationStatus: patch.verificationStatus ?? current.verificationStatus,
    doctorNote: patch.doctorNote !== undefined ? patch.doctorNote : current.doctorNote,
    updatedAt: nowIso,
  };
  findings[targetIdx] = updated;
  await writeLocalFindings(findings);
  return updated;
}

export async function verifyCaseFindings(
  imageId: string,
  verificationStatus: VerificationStatus
): Promise<ReferenceFinding[]> {
  const nowIso = new Date().toISOString();

  if (hasNeonDatabase()) {
    await ensureNeonInitialized();
    const sql = getSql();
    const rows = await sql`
      UPDATE reference_findings
      SET verification_status = ${verificationStatus}, updated_at = ${nowIso}::timestamptz
      WHERE image_id = ${imageId}
      RETURNING id, image_id, rf_label, rf_index, image_url, finding_text,
                csv_status, boxes, original_boxes, verification_status,
                doctor_note, impression_relevance_prior, updated_at
    `;
    return rows.map((r) => mapDbRow(r as Record<string, unknown>));
  }

  const findings = await readLocalFindings();
  const updatedList: ReferenceFinding[] = [];
  for (let i = 0; i < findings.length; i++) {
    if (findings[i].imageId === imageId) {
      findings[i] = { ...findings[i], verificationStatus, updatedAt: nowIso };
      updatedList.push(findings[i]);
    }
  }
  await writeLocalFindings(findings);
  return updatedList;
}
