// Portable DB snapshot — exports each populated table to a gzipped CSV using
// COPY (no psql/pg_dump needed; embedded-postgres ships neither). Restore with
// `npm run db:import`. Run: npm run db:export
import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { to as copyTo } from 'pg-copy-streams';
import { connectClient } from '../db.js';
import { SNAPSHOT_DIR, SNAPSHOT_TABLES, snapshotColumns } from './tables.js';

mkdirSync(SNAPSHOT_DIR, { recursive: true });
const client = await connectClient();
try {
  let total = 0;
  for (const t of SNAPSHOT_TABLES) {
    const dest = resolve(SNAPSHOT_DIR, `${t}.csv.gz`);
    const cols = await snapshotColumns(client, t);
    const stream = client.query(copyTo(`COPY (SELECT ${cols} FROM "${t}") TO STDOUT WITH (FORMAT csv, HEADER)`));
    await pipeline(stream, createGzip({ level: 9 }), createWriteStream(dest));
    const mb = statSync(dest).size / 1024 / 1024;
    total += mb;
    console.log(`  ↳ ${t.padEnd(22)} ${mb.toFixed(1)} MB`);
  }
  console.log(`✓ Snapshot written to ${SNAPSHOT_DIR} (${total.toFixed(1)} MB total)`);
} finally {
  await client.end();
}
