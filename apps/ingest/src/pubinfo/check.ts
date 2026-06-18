// Dev utility: validate the .dat parser against real sample files.
// Run: npx tsx apps/ingest/src/pubinfo/check.ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDat, type Row } from './parser.js';
import { PUBINFO_TABLES } from './tables.js';

const dir = resolve(process.cwd(), '.data-cache/sample');

for (const t of PUBINFO_TABLES) {
  const path = resolve(dir, t.dat);
  if (!existsSync(path)) {
    console.log(`--  ${t.dat.padEnd(30)} (not in sample)`);
    continue;
  }
  const expected = t.columns.length;
  const hist = new Map<number, number>();
  let rows = 0;
  let firstBad: Row | null = null;
  await parseDat(path, (row) => {
    rows++;
    hist.set(row.length, (hist.get(row.length) ?? 0) + 1);
    if (row.length !== expected && !firstBad) firstBad = row;
  });
  const counts = [...hist.entries()].sort().map(([k, v]) => `${k}cols×${v}`).join(' ');
  const ok = hist.size === 1 && hist.has(expected);
  console.log(`${ok ? 'OK ' : 'BAD'} ${t.dat.padEnd(30)} rows=${String(rows).padStart(5)} expected=${expected} got=[${counts}]`);
  if (firstBad) console.log(`      first off-width row: ${JSON.stringify((firstBad as Row).slice(0, 8))}`);
}
