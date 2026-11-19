import fs from 'node:fs/promises';
import path from 'node:path';

const csvPath = path.join(process.cwd(), 'data', 'ViX-Ray_PreAnnotated.csv');
const sourceDir = process.env.LOCAL_IMAGES_DIR || 'D:\\uit\\kltn\\requirement_ViX-Ray\\images';
const uploadAll = process.argv.includes('--all');
const concurrency = 12;

function parseSasBase(sasUrl) {
  const trimmed = sasUrl.trim();
  const qIndex = trimmed.indexOf('?');
  if (qIndex < 0) {
    throw new Error('AZURE_UPLOAD_SAS_URL must include a ?sas query token.');
  }
  return {
    base: trimmed.slice(0, qIndex).replace(/\/+$/, ''),
    query: trimmed.slice(qIndex),
  };
}

async function getTargetFiles() {
  if (uploadAll) {
    const entries = await fs.readdir(sourceDir);
    return entries.filter((name) => /\.jpg$/i.test(name)).sort();
  }
  const csv = await fs.readFile(csvPath, 'utf-8');
  const lines = csv.split(/\r?\n/).slice(1).filter(Boolean);
  const ids = new Set();
  for (const line of lines) {
    const id = line.split(',')[1]?.trim();
    if (id) ids.add(`${id}.jpg`);
  }
  return Array.from(ids).sort();
}

async function uploadBlob(base, query, fileName) {
  const filePath = path.join(sourceDir, fileName);
  const body = await fs.readFile(filePath);
  const targetUrl = `${base}/${encodeURIComponent(fileName)}${query}`;

  const res = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed for ${fileName} (${res.status}): ${text}`);
  }
}

async function main() {
  const sasUrl = process.env.AZURE_UPLOAD_SAS_URL;
  if (!sasUrl) {
    console.error('Missing AZURE_UPLOAD_SAS_URL environment variable.');
    process.exit(1);
  }

  const { base, query } = parseSasBase(sasUrl);
  const files = await getTargetFiles();
  console.log(`Uploading ${files.length} images to ${base}...`);

  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < files.length) {
      const current = files[index++];
      await uploadBlob(base, query, current);
      completed++;
      if (completed % 25 === 0 || completed === files.length) {
        console.log(`Progress: ${completed}/${files.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log('Upload completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
