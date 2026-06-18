// One-off: remove duplicate (bill_id, subject, source) rows from bill_subject for a
// SINGLE state, keeping the lowest id. bill_subject has no unique constraint, so a
// re-run of an importer that used ON CONFLICT DO NOTHING could double tags. Scoped to
// one state (only that state's rows are touched) so it can't affect other states' data.
// Usage: STATE=NY DATABASE_URL=… node scripts/dedup-bill-subject.mjs
import pg from 'pg';

const url = process.env.DATABASE_URL;
const state = (process.env.STATE ?? '').toUpperCase();
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
if (!/^[A-Z]{2}$/.test(state)) {
  console.error('STATE (2-letter) required, e.g. STATE=NY');
  process.exit(1);
}
const c = new pg.Client({ connectionString: url });
await c.connect();

const before = await c.query(
  `SELECT bs.subject, count(*)::int AS rows, count(DISTINCT bs.bill_id)::int AS distinct_bills
   FROM bill_subject bs JOIN bill b ON b.id = bs.bill_id
   WHERE bs.source = 'foreign-affairs' AND b.state = $1 GROUP BY bs.subject ORDER BY bs.subject`,
  [state],
);
console.log(`before (${state}) — FA rows vs distinct bills by subject:`, before.rows);

// Scoped to this state's bills only.
const del = await c.query(
  `DELETE FROM bill_subject a USING bill_subject b
   WHERE a.id > b.id AND a.bill_id = b.bill_id AND a.subject = b.subject AND a.source = b.source
     AND a.bill_id IN (SELECT id FROM bill WHERE state = $1)`,
  [state],
);
console.log(`deleted duplicate ${state} rows:`, del.rowCount);

const after = await c.query(
  `SELECT bs.subject, count(*)::int AS rows FROM bill_subject bs JOIN bill b ON b.id = bs.bill_id
   WHERE bs.source = 'foreign-affairs' AND b.state = $1 GROUP BY bs.subject ORDER BY bs.subject`,
  [state],
);
console.log(`after (${state}) — FA rows by subject:`, after.rows);

await c.end();
