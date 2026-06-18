import { connectClient } from '../db.js';
import { ingestBillText } from './billtext.js';
import { ensureArchive, extractDatFiles, resolveArchive } from './download.js';
import { loadAllStaging } from './load.js';
import { normalize } from './normalize.js';
import { PUBINFO_TABLES } from './tables.js';

/** Full PUBINFO pipeline: download → extract → stage (COPY) → normalize. */
export async function runPubinfo(archive?: string): Promise<Record<string, number>> {
  const { url, zipPath, file, archive: resolved } = resolveArchive(archive);
  const client = await connectClient();

  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('pubinfo', $1, 'running') RETURNING id`,
    [`pubinfo:${resolved}`],
  );
  const runId = rows[0]!.id;

  try {
    await ensureArchive(url, zipPath);
    console.log(`• Extracting .dat files from ${file}…`);
    const datPaths = await extractDatFiles(zipPath, PUBINFO_TABLES.map((t) => t.dat));

    console.log('• Loading staging tables…');
    await loadAllStaging(client, datPaths);

    console.log('• Normalizing…');
    const counts = await normalize(client);

    console.log('• Ingesting bill text (digest + full text)…');
    const text = await ingestBillText(client, zipPath);
    (counts as Record<string, number>).billText = text.updated;

    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      counts,
    ]);
    console.log('✓ PUBINFO ingest complete:', counts);
    return counts;
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
