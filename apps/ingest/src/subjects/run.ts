import { connectClient } from '../db.js';
import { tagSubjects } from './tagger.js';

/** Tag bills with coarse issue areas from their text (key-free fallback for the
 * Open States subject taxonomy). Replaces any prior 'keyword'-sourced tags. */
export async function runSubjects(): Promise<{ bills: number; tags: number }> {
  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('subjects', 'enrich', 'running') RETURNING id`,
  );
  const runId = runRows[0]!.id;
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM bill_subject WHERE source = 'keyword'`);

    // Title + digest carry the signal; full_text adds recall. Cap length so a few
    // huge bills don't dominate runtime — the digest already names the topic.
    const { rows } = await client.query<{ id: string; t: string }>(
      `SELECT id, left(coalesce(title,'') || ' ' || coalesce(digest, summary, '') || ' ' || coalesce(full_text,''), 20000) AS t
       FROM bill`,
    );

    let bills = 0;
    let tags = 0;
    for (const b of rows) {
      const subjects = tagSubjects(b.t);
      if (!subjects.length) continue;
      bills++;
      for (const s of subjects) {
        await client.query(`INSERT INTO bill_subject (bill_id, subject, source) VALUES ($1, $2, 'keyword')`, [
          b.id,
          s,
        ]);
        tags++;
      }
    }
    await client.query('COMMIT');

    const stats = { bills, tags };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      stats,
    ]);
    console.log(`  ↳ subjects: ${tags} keyword tags across ${bills} bills`);
    return stats;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client
      .query(`UPDATE ingest_run SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [
        runId,
        String((err as Error)?.message ?? err),
      ])
      .catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
