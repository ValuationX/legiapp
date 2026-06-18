// Focused publish snapshot — a small, on-topic DB for the published Nova Ukraine
// tool: ALL foreign-affairs bills (every session) + the ~250 most recently-active
// current-session bills, their related rows, current members, and any historical
// legislators who sponsored a kept bill. The dev DB keeps everything; this is what
// the published deployment imports. Run: npm run db:export:focused
import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { to as copyTo } from 'pg-copy-streams';
import { connectClient } from '../db.js';
import { SNAPSHOT_TABLES, snapshotColumns } from './tables.js';

const FOCUSED_DIR = resolve(process.cwd(), 'data-snapshot-focused');
const ACTIVE_CAP = 250;

// Per-table row filter, all scoped to the kept bill / legislator sets.
const FILTER: Record<string, string> = {
  legislator: 'WHERE id IN (SELECT id FROM _keep_legs)',
  committee: '',
  leadership_role: 'WHERE legislator_id IN (SELECT id FROM _keep_legs)',
  committee_membership: '',
  member_position: '',
  bill: 'WHERE id IN (SELECT id FROM _keep_bills)',
  bill_action: 'WHERE bill_id IN (SELECT id FROM _keep_bills)',
  bill_subject: 'WHERE bill_id IN (SELECT id FROM _keep_bills)',
  sponsorship: 'WHERE bill_id IN (SELECT id FROM _keep_bills)',
  vote_event: 'WHERE bill_id IN (SELECT id FROM _keep_bills)',
  vote_record: 'WHERE vote_event_id IN (SELECT id FROM vote_event WHERE bill_id IN (SELECT id FROM _keep_bills))',
  committee_hearing: 'WHERE bill_id IN (SELECT id FROM _keep_bills)',
  district: '',
  ingest_run: '',
};

mkdirSync(FOCUSED_DIR, { recursive: true });
const client = await connectClient();
try {
  await client.query(`
    CREATE TEMP TABLE _keep_bills AS
      SELECT bill_id AS id FROM bill_subject WHERE source = 'foreign-affairs'
      UNION
      SELECT bill_id FROM member_position WHERE bill_id IS NOT NULL
      UNION
      SELECT id FROM (
        SELECT id FROM bill
        WHERE session_year = (SELECT max(session_year) FROM bill)
          AND coalesce(status, '') !~* 'died|vetoed' AND last_action_date IS NOT NULL
        ORDER BY last_action_date DESC LIMIT ${ACTIVE_CAP}
      ) recent;`);
  await client.query(`
    CREATE TEMP TABLE _keep_legs AS
      SELECT id FROM legislator WHERE active = true
      UNION
      SELECT DISTINCT legislator_id FROM sponsorship
        WHERE legislator_id IS NOT NULL AND bill_id IN (SELECT id FROM _keep_bills)
      UNION
      SELECT DISTINCT vr.legislator_id FROM vote_record vr JOIN vote_event ve ON ve.id = vr.vote_event_id
        WHERE vr.legislator_id IS NOT NULL AND ve.bill_id IN (SELECT id FROM _keep_bills);`);

  const billCount = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM _keep_bills`)).rows[0]!.n;
  const legCount = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM _keep_legs`)).rows[0]!.n;
  console.log(`• Focused snapshot: ${billCount} bills, ${legCount} legislators`);

  let total = 0;
  for (const t of SNAPSHOT_TABLES) {
    const dest = resolve(FOCUSED_DIR, `${t}.csv.gz`);
    const cols = await snapshotColumns(client, t);
    const stream = client.query(
      copyTo(`COPY (SELECT ${cols} FROM "${t}" ${FILTER[t] ?? ''}) TO STDOUT WITH (FORMAT csv, HEADER)`),
    );
    await pipeline(stream, createGzip({ level: 9 }), createWriteStream(dest));
    const mb = statSync(dest).size / 1024 / 1024;
    total += mb;
    console.log(`  ↳ ${t.padEnd(22)} ${mb.toFixed(2)} MB`);
  }
  console.log(`✓ Focused snapshot written to ${FOCUSED_DIR} (${total.toFixed(1)} MB total)`);
} finally {
  await client.end();
}
