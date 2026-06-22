// Tag CALIFORNIA bills with foreign-affairs region keys (Ukraine, Russia, …) for the
// tracker. Matched over TITLE + DIGEST + SUMMARY (precision) — incidental country
// mentions live in the bill body and are excluded. CA-SCOPED: source-fed states
// (NY/OH/MI/…) get their FA tags from their own importer (apps/ingest/src/openstates),
// so this never deletes or duplicates another state's tags. Stored in bill_subject
// with source='foreign-affairs' (the general "Foreign Affairs" umbrella subject for the
// Bills filter is produced separately by the keyword tagger).
import { FA_REGIONS, regionPgRegex } from '@legiapp/shared';
import { connectClient } from '../db.js';

const SOURCE = 'foreign-affairs';
// digest is the precise signal; title + summary back it up. Body text is intentionally excluded.
const CORPUS = `(coalesce(b.title,'') || ' ' || coalesce(b.digest,'') || ' ' || coalesce(b.summary,''))`;

export async function runForeignAffairs(): Promise<{ tags: number; byRegion: Record<string, number> }> {
  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('foreign-affairs', 'enrich', 'running') RETURNING id`,
  );
  const runId = runRows[0]!.id;
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM bill_subject WHERE source = $1 AND bill_id IN (SELECT id FROM bill WHERE state = 'CA')`,
      [SOURCE],
    );

    const byRegion: Record<string, number> = {};
    let tags = 0;
    for (const r of FA_REGIONS) {
      const res = await client.query(
        `INSERT INTO bill_subject (bill_id, subject, source)
         SELECT b.id, $2, $3 FROM bill b WHERE b.state = 'CA' AND ${CORPUS} ~* $1`,
        [regionPgRegex(r.stems), r.key, SOURCE],
      );
      byRegion[r.key] = res.rowCount ?? 0;
      tags += res.rowCount ?? 0;
    }
    await client.query('COMMIT');

    const stats = { tags, byRegion };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      stats,
    ]);
    console.log(`  ↳ foreign-affairs: ${tags} region tags`, byRegion);
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
