import fs from 'node:fs/promises';
import path from 'node:path';

const csvPath = path.join(process.cwd(), 'data', 'ViX-Ray_PreAnnotated.csv');
const sourceDir = process.env.LOCAL_IMAGES_DIR || 'D:\\uit\\kltn\\requirement_ViX-Ray\\images';
const targetDir = path.join(process.cwd(), 'public', 'xrays');

async function main() {
  const csv = await fs.readFile(csvPath, 'utf-8');
  const lines = csv.split(/\r?\n/).slice(1).filter(Boolean);
  const imageIds = new Set();

  for (const line of lines) {
    const parts = line.split(',');
    if (parts[1]) imageIds.add(parts[1].trim());
  }

  await fs.mkdir(targetDir, { recursive: true });
  let copied = 0;
  let skipped = 0;
  let missing = 0;

  for (const id of imageIds) {
    const src = path.join(sourceDir, `${id}.jpg`);
    const dst = path.join(targetDir, `${id}.jpg`);
    try {
      await fs.access(dst);
      skipped++;
      continue;
    } catch {
    }
    try {
      await fs.copyFile(src, dst);
      copied++;
    } catch {
      missing++;
      console.warn(`Missing source image: ${src}`);
    }
  }

  console.log(`Synced ${imageIds.size} CSV images -> ${targetDir}`);
  console.log(`Copied: ${copied}, Already present: ${skipped}, Missing: ${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
