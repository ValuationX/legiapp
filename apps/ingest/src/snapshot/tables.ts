import { resolve } from 'node:path';
import type pg from 'pg';

// Override with SNAPSHOT_DIR to import/export a different snapshot (e.g. the focused
// publish snapshot in data-snapshot-focused).
export const SNAPSHOT_DIR = resolve(process.cwd(), process.env.SNAPSHOT_DIR ?? 'data-snapshot');

/** Real, non-generated columns for a table (search_tsv is GENERATED → excluded). */
export async function snapshotColumns(client: pg.Client, table: string): Promise<string> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'
     ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => `"${r.column_name}"`).join(', ');
}

// Parent-first order so COPY FROM satisfies foreign keys on import.
export const SNAPSHOT_TABLES = [
  'legislator',
  'committee',
  'leadership_role',
  'committee_membership',
  'member_position',
  'bill',
  'bill_action',
  'bill_subject',
  'sponsorship',
  'vote_event',
  'vote_record',
  'committee_hearing',
  'district',
  'ingest_run',
];
