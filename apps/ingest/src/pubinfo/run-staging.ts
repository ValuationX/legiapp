// Dev utility: download/extract the archive and load only the raw staging tables.
// Run: npx tsx apps/ingest/src/pubinfo/run-staging.ts
import { createClient } from '../db.js';
import { ensureArchive, extractDatFiles, resolveArchive } from './download.js';
import { loadAllStaging } from './load.js';
import { PUBINFO_TABLES } from './tables.js';

const { url, zipPath, file } = resolveArchive();
await ensureArchive(url, zipPath);

console.log(`• Extracting .dat files from ${file}…`);
const datPaths = await extractDatFiles(
  zipPath,
  PUBINFO_TABLES.map((t) => t.dat),
);

const client = createClient();
await client.connect();
try {
  console.log('• Loading staging tables…');
  await loadAllStaging(client, datPaths);
  console.log('✓ Staging loaded');
} finally {
  await client.end();
}
