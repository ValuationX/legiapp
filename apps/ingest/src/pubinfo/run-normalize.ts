// Dev utility: run only normalization against already-loaded staging.
// Run: npx tsx apps/ingest/src/pubinfo/run-normalize.ts
import { createClient } from '../db.js';
import { normalize } from './normalize.js';

const client = createClient();
await client.connect();
try {
  const counts = await normalize(client);
  console.log('✓ Normalized:', counts);
} finally {
  await client.end();
}
