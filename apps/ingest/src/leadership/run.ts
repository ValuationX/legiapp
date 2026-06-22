// Apply curated chamber leadership for a source-fed state: match each official-page
// entry to the loaded roster by name (within the same chamber) and write leadership_role.
// State-scoped + replace-on-rerun; unmatched names are reported, never invented.
import { isStateCode, type StateCode } from '@legiapp/shared';
import { connectClient } from '../db.js';
import { LEADERSHIP_BY_STATE } from './data.js';

const SUFFIX = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);
/** lowercase, strip accents + punctuation, collapse spaces. */
const clean = (s: string) =>
  (s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
/** name tokens minus generational suffixes (Jr./III/…). */
const toks = (s: string) => clean(s).split(' ').filter((t) => t && !SUFFIX.has(t));

export async function runLeadership(stateRaw: string): Promise<void> {
  const st = (stateRaw ?? '').toUpperCase();
  if (!isStateCode(st)) throw new Error(`unknown state: ${stateRaw}`);
  const entries = LEADERSHIP_BY_STATE[st as StateCode];
  if (!entries?.length) {
    console.log(`${st}: no curated leadership — skipping`);
    return;
  }
  const client = await connectClient();
  try {
    // Match on full_name — source-fed rosters populate full_name (first_name is often null).
    const rows = (
      await client.query<{ id: string; chamber: string; full: string }>(
        `SELECT id, chamber, coalesce(full_name,'') AS full FROM legislator WHERE state = $1 AND active = true`,
        [st],
      )
    ).rows;

    // Match keys, scoped by chamber: "first last" (tolerates middle initials/suffixes) and
    // bare "last" (only when unique within the chamber, to disambiguate same-surname pairs).
    const byFirstLast = new Map<string, string>();
    const byLast = new Map<string, string>();
    const dupLast = new Set<string>();
    for (const r of rows) {
      const t = toks(r.full);
      if (!t.length) continue;
      const first = t[0]!;
      const last = t[t.length - 1]!;
      byFirstLast.set(`${r.chamber}|${first} ${last}`, r.id);
      const lk = `${r.chamber}|${last}`;
      if (byLast.has(lk)) dupLast.add(lk);
      else byLast.set(lk, r.id);
    }
    const match = (chamber: string, name: string): string | null => {
      const t = toks(name);
      if (!t.length) return null;
      const first = t[0]!;
      const last = t[t.length - 1]!;
      const fl = byFirstLast.get(`${chamber}|${first} ${last}`);
      if (fl) return fl;
      const lk = `${chamber}|${last}`;
      if (!dupLast.has(lk) && byLast.has(lk)) return byLast.get(lk)!;
      return null;
    };

    await client.query(
      `DELETE FROM leadership_role
       WHERE source = 'positions-guide' AND legislator_id IN (SELECT id FROM legislator WHERE state = $1)`,
      [st],
    );
    let inserted = 0;
    const unmatched: string[] = [];
    for (const e of entries) {
      const id = match(e.chamber, e.name);
      if (!id) {
        unmatched.push(`${e.chamber}/${e.role}: ${e.name}`);
        continue;
      }
      await client.query(
        `INSERT INTO leadership_role (legislator_id, role, chamber, source)
         VALUES ($1, $2, $3::chamber, 'positions-guide')`,
        [id, e.role, e.chamber],
      );
      inserted++;
    }
    console.log(
      `✓ ${st} leadership: ${inserted}/${entries.length} applied` +
        (unmatched.length ? `\n   UNMATCHED (${unmatched.length}): ${unmatched.join(' | ')}` : ''),
    );
  } finally {
    await client.end();
  }
}
