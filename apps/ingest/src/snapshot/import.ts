// Restore a portable DB snapshot (gzipped CSVs) via COPY. Apply migrations first
// (`npm run migrate`), then run: npm run db:import
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { from as copyFrom } from 'pg-copy-streams';
import { connectClient } from '../db.js';
import { SNAPSHOT_DIR, SNAPSHOT_TABLES, snapshotColumns } from './tables.js';

const client = await connectClient();
try {
  await client.query(
    `TRUNCATE ${SNAPSHOT_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  for (const t of SNAPSHOT_TABLES) {
    const f = resolve(SNAPSHOT_DIR, `${t}.csv.gz`);
    if (!existsSync(f)) {
      console.log(`  ! skip ${t} (no snapshot file)`);
      continue;
    }
    const cols = await snapshotColumns(client, t);
    const stream = client.query(copyFrom(`COPY "${t}" (${cols}) FROM STDIN WITH (FORMAT csv, HEADER)`));
    await pipeline(createReadStream(f), createGunzip(), stream);
    console.log(`  ↳ imported ${t}`);
  }

  // Re-sync serial sequences: COPY inserts explicit ids without advancing the
  // owning sequence (and TRUNCATE RESTART IDENTITY reset them to 1), so a later
  // DEFAULT insert (e.g. an ingest_run row) would collide on the primary key.
  for (const t of SNAPSHOT_TABLES) {
    const seq = (await client.query<{ seq: string | null }>(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [t]))
      .rows[0]?.seq;
    if (!seq) continue; // text-id tables have no serial sequence
    await client.query(
      `SELECT setval('${seq}', GREATEST((SELECT COALESCE(max(id), 0) FROM "${t}"), 1), (SELECT count(*) > 0 FROM "${t}"))`,
    );
  }
  console.log('✓ Snapshot imported');
} finally {
  await client.end();
}
