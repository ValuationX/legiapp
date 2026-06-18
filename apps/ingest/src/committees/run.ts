// Committee rosters + chair flags — key-free. PUBINFO has no membership data and
// the chamber committee pages are 24+ heterogeneous subdomains (Senate) / a JS
// app (Assembly), so we use the maintained, structured **OpenStates People** repo
// (raw GitHub YAML — no API key). One file per committee with name, chamber, and
// a members[] list of { name, role }. We match each committee + member back to
// our PUBINFO spine by chamber + name.
import yaml from 'js-yaml';
import type pg from 'pg';
import { connectClient } from '../db.js';

const DIR_API = 'https://api.github.com/repos/openstates/people/contents/data/ca/committees';
const SOURCE = 'openstates-people';

interface CommitteeYaml {
  id?: string;
  name?: string;
  chamber?: string; // "lower" | "upper" | "legislature"
  classification?: string;
  members?: { name?: string; role?: string }[];
}

interface GhFile {
  name: string;
  download_url: string | null;
  type: string;
}

type Chamber = 'assembly' | 'senate' | null;

interface ParsedCommittee {
  chamber: Chamber;
  name: string;
  committeeId: string; // osp-<uuid>, used when no PUBINFO committee matches
  members: { name?: string; role?: string }[];
}

function chamberFrom(y: CommitteeYaml, filename: string): Chamber {
  const c = (y.chamber ?? '').toLowerCase();
  if (c === 'lower' || filename.startsWith('lower-')) return 'assembly';
  if (c === 'upper' || filename.startsWith('upper-')) return 'senate';
  return null; // joint / legislature-wide
}

/** Normalize a committee name for fuzzy matching to the PUBINFO spine. */
function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bcommittee\b/g, '')
    .replace(/\bstanding\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const roleOf = (raw: string | undefined): 'chair' | 'vice_chair' | 'member' => {
  const r = (raw ?? '').toLowerCase();
  if (r.includes('vice')) return 'vice_chair';
  if (r.includes('chair')) return 'chair';
  return 'member';
};

/** Resolve an OpenStates member name to one of our legislators (best-effort).
 * Both the full-name and last-name paths require a UNIQUE hit — important for
 * joint committees where chamber is null and a name could match across chambers. */
async function resolveLegislator(client: pg.Client, name: string, chamber: Chamber): Promise<string | null> {
  const full = name.trim();
  const last = full.split(/\s+/).pop() ?? '';
  const chamberClause = chamber ? 'AND chamber = $2::chamber' : '';
  const params = chamber ? [full, chamber] : [full];
  const exact = await client.query<{ id: string }>(
    `SELECT id FROM legislator WHERE active = true AND lower(full_name) = lower($1) ${chamberClause}`,
    params,
  );
  if (exact.rows.length === 1) return exact.rows[0]!.id;
  if (exact.rows.length > 1) return null; // ambiguous full name (cross-chamber) — skip
  const byLast = await client.query<{ id: string }>(
    `SELECT id FROM legislator WHERE active = true AND lower(last_name) = lower($1)
       ${chamber ? 'AND chamber = $2::chamber' : ''}`,
    chamber ? [last, chamber] : [last],
  );
  return byLast.rows.length === 1 ? byLast.rows[0]!.id : null; // skip ambiguous last names
}

async function listFiles(): Promise<GhFile[]> {
  const res = await fetch(DIR_API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'legiapp-ingest' },
  });
  if (!res.ok) throw new Error(`GitHub listing failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
  return ((await res.json()) as GhFile[]).filter((f) => f.type === 'file' && f.name.endsWith('.yml'));
}

/** Fetch + parse every committee file. Throws on any fetch failure so we never
 * proceed to wipe a good roster on a transient network blip. */
async function fetchAllCommittees(): Promise<ParsedCommittee[]> {
  const files = await listFiles();
  console.log(`• Committee rosters from OpenStates People (${files.length} committees)…`);
  const out: ParsedCommittee[] = [];
  for (const f of files) {
    if (!f.download_url) continue; // directory entry without a raw URL — skip (not fatal)
    const raw = await fetch(f.download_url, { headers: { 'User-Agent': 'legiapp-ingest' } });
    if (!raw.ok) throw new Error(`fetch ${f.name} failed: ${raw.status}`); // fatal — don't commit a partial roster
    const y = yaml.load(await raw.text()) as CommitteeYaml;
    if (!y?.name || !y.members?.length) continue; // legitimately empty — skip
    const uuid = (y.id ?? '').split('/').pop() || f.name.replace(/\.yml$/, '').slice(-36);
    out.push({ chamber: chamberFrom(y, f.name), name: y.name, committeeId: `osp-${uuid}`, members: y.members });
  }
  return out;
}

export async function runCommittees(): Promise<{ committees: number; memberships: number; unmatchedMembers: number }> {
  // Do all network I/O BEFORE touching the DB — a fetch failure aborts here,
  // leaving the existing roster intact rather than committing a partial one.
  const parsed = await fetchAllCommittees();

  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('committees', 'enrich', 'running') RETURNING id`,
  );
  const runId = runRows[0]!.id;
  try {
    await client.query('BEGIN');
    // Clean slate for an idempotent re-run: drop our memberships, then the
    // committees we inserted (matched PUBINFO committees keep their own source).
    await client.query(`DELETE FROM committee_membership WHERE source = $1`, [SOURCE]);
    await client.query(`DELETE FROM committee WHERE source = $1`, [SOURCE]);

    let committees = 0;
    let memberships = 0;
    let unmatchedMembers = 0;

    for (const c of parsed) {
      // Match to an existing PUBINFO committee by chamber + normalized name; else insert.
      const match = await client.query<{ id: string }>(
        c.chamber
          ? `SELECT id FROM committee WHERE chamber = $1::chamber AND regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g') = $2 LIMIT 1`
          : `SELECT id FROM committee WHERE chamber IS NULL AND regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g') = $1 LIMIT 1`,
        c.chamber ? [c.chamber, normName(c.name)] : [normName(c.name)],
      );
      let committeeId = match.rows[0]?.id;
      if (!committeeId) {
        committeeId = c.committeeId;
        await client.query(
          `INSERT INTO committee (id, name, chamber, type, source)
           VALUES ($1, $2, $3::chamber, 'standing', $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, last_verified = now()`,
          [committeeId, c.name, c.chamber, SOURCE],
        );
        committees++;
      }

      for (const m of c.members) {
        if (!m.name) continue;
        const legId = await resolveLegislator(client, m.name, c.chamber);
        if (!legId) {
          unmatchedMembers++;
          continue;
        }
        // source in the upsert so this step owns (and can later clean) the row
        // even if another source inserted it first.
        await client.query(
          `INSERT INTO committee_membership (committee_id, legislator_id, role, source)
           VALUES ($1, $2, $3::committee_role, $4)
           ON CONFLICT (committee_id, legislator_id)
             DO UPDATE SET role = EXCLUDED.role, source = EXCLUDED.source, last_verified = now()`,
          [committeeId, legId, roleOf(m.role), SOURCE],
        );
        memberships++;
      }
    }
    await client.query('COMMIT');

    const stats = { committees, memberships, unmatchedMembers };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      stats,
    ]);
    console.log(`  ↳ committees: +${committees} new, ${memberships} memberships (${unmatchedMembers} members unmatched)`);
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
