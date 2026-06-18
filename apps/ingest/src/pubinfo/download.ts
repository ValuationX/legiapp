import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';

const BASE_URL = 'https://downloads.leginfo.legislature.ca.gov';
export const CACHE_DIR = resolve(process.cwd(), '.data-cache');
const EXTRACT_DIR = resolve(CACHE_DIR, 'extracted');

/**
 * Resolve which PUBINFO archive to use.
 *   "2025"        -> pubinfo_2025.zip       (full 2025-2026 session — the seed)
 *   "daily_Tue"   -> pubinfo_daily_Tue.zip  (full daily snapshot)
 *   "Tue"         -> pubinfo_Tue.zip        (small weekly incremental)
 */
export function resolveArchive(archive = process.env.PUBINFO_ARCHIVE ?? '2025') {
  const file = `pubinfo_${archive}.zip`;
  return { archive, file, url: `${BASE_URL}/${file}`, zipPath: resolve(CACHE_DIR, file) };
}

export async function ensureArchive(url: string, zipPath: string): Promise<string> {
  if (existsSync(zipPath) && statSync(zipPath).size > 0) {
    console.log(`• Using cached archive ${basename(zipPath)} (${mb(statSync(zipPath).size)})`);
    return zipPath;
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`• Downloading ${url} …`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(zipPath));
  console.log(`✓ Downloaded ${basename(zipPath)} (${mb(statSync(zipPath).size)})`);
  return zipPath;
}

/**
 * Extract only the named .dat files (skipping the thousands of bill-text .lob
 * entries). Returns a map of dat-filename -> extracted path. Matching is
 * case-insensitive on the basename.
 */
export async function extractDatFiles(
  zipPath: string,
  datNames: string[],
): Promise<Map<string, string>> {
  mkdirSync(EXTRACT_DIR, { recursive: true });
  const wanted = new Map(datNames.map((n) => [n.toLowerCase(), n]));
  const out = new Map<string, string>();

  const directory = await unzipper.Open.file(zipPath);
  for (const entry of directory.files) {
    if (entry.type !== 'File') continue;
    const base = basename(entry.path).toLowerCase();
    const original = wanted.get(base);
    if (!original) continue;
    const dest = resolve(EXTRACT_DIR, original);
    await pipeline(entry.stream(), createWriteStream(dest));
    out.set(original, dest);
  }
  for (const [, name] of wanted) {
    if (!out.has(name)) console.warn(`  ! ${name} not found in archive`);
  }
  return out;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
