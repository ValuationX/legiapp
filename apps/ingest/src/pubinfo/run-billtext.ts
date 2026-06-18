// Dev utility: ingest bill text (digest + full text) against already-loaded data.
// Run: npx tsx apps/ingest/src/pubinfo/run-billtext.ts
import { connectClient } from '../db.js';
import { ingestBillText } from './billtext.js';
import { resolveArchive } from './download.js';

const { zipPath } = resolveArchive();
const client = await connectClient();
try {
  const { updated } = await ingestBillText(client, zipPath);
  console.log(`✓ Bill text ingested for ${updated} bills`);
} finally {
  await client.end();
}
