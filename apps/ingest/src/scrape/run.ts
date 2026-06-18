import { connectClient } from '../db.js';
import { enrichMembers, scrapeSenatePhotos } from './enrich.js';

/** Member enrichment: photos + leadership (and, later, committee rosters). */
export async function runScrape(): Promise<Record<string, number>> {
  const client = await connectClient();
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('ca_chambers', 'enrich', 'running') RETURNING id`,
  );
  const runId = rows[0]!.id;
  try {
    console.log('• Enriching members (photos + leadership)…');
    const stats = await enrichMembers(client);
    console.log('• Scraping Senate member photos (best effort)…');
    const senatePhotos = await scrapeSenatePhotos(client);
    const merged = { ...stats, senatePhotos };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      merged,
    ]);
    console.log('✓ Enrichment complete:', merged);
    return merged;
  } catch (err) {
    await client.query(`UPDATE ingest_run SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [
      runId,
      String((err as Error)?.message ?? err),
    ]);
    throw err;
  } finally {
    await client.end();
  }
}
