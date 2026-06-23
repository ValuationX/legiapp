// Import roll-call votes for a source-fed state (NY/OH/MI/…) from Open States session
// CSVs into vote_event + vote_record. SCOPED to bills already loaded in the DB (the
// focused set), so it stays small and relevant. Voters are linked to existing
// legislators by their Open States person id (the `:os:<pid>` suffix on legislator.id);
// unmatched voters are still recorded by name (legislator_id is nullable). Re-running
// replaces the state's votes (DELETE … WHERE state=$1, which cascades vote_record).
// DRY by default; IMPORT_APPLY=1 writes.
//   DRY:   OS_CSV_DIRS="…dirs…" npm run ingest -- votes NY
//   APPLY: IMPORT_APPLY=1 DATABASE_URL=<neon> OS_CSV_DIRS="…" npm run ingest -- votes NY
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { isStateCode } from '@legiapp/shared';
import { connectClient } from '../db.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DRY = process.env.IMPORT_APPLY !== '1';

function readCsv(path: string): any[] {
  if (!existsSync(path)) return [];
  return parse(readFileSync(path), { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}

const tail = (s?: string) => (s ?? '').split('/').pop() ?? ''; // "ocd-vote/<uuid>" -> "<uuid>"
const chamberOf = (c?: string) => (c === 'lower' ? 'assembly' : c === 'upper' ? 'senate' : null);

export function mapOption(o?: string): 'yea' | 'nay' | 'abstain' | 'absent' | 'other' {
  switch ((o ?? '').toLowerCase()) {
    case 'yes':
      return 'yea';
    case 'no':
      return 'nay';
    case 'absent':
    case 'excused':
      return 'absent';
    case 'abstain':
    case 'not voting':
    case 'present':
      return 'abstain';
    default:
      return 'other';
  }
}

interface VEvent {
  id: string;
  billId: string;
  date: string | null;
  chamber: 'assembly' | 'senate' | null;
  isFloor: boolean;
  motion: string | null;
  result: string | null;
  ayes: number;
  noes: number;
  abstain: number;
}
interface VRecord {
  voteEventId: string;
  legislatorId: string | null;
  legislatorName: string;
  option: ReturnType<typeof mapOption>;
}

/** Chunked multi-row INSERT (one round-trip per `chunk` rows). `rowSql(offset)`
 *  returns the `($1,$2,…)` group for one row; `rows` are arrays of param values. */
export async function batchInsert(
  client: any,
  prefix: string,
  suffix: string,
  perRow: number,
  rowSql: (offset: number) => string,
  rows: any[][],
  chunk = 400,
): Promise<number> {
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const values = slice.map((_, j) => rowSql(j * perRow)).join(',');
    await client.query(`${prefix} ${values} ${suffix}`, slice.flat());
    n += slice.length;
  }
  return n;
}

export async function runVotesImport(stateRaw: string): Promise<void> {
  const st = (stateRaw ?? '').toUpperCase();
  if (!isStateCode(st) || st === 'CA') {
    throw new Error('votes import is for source-fed states (e.g. NY/OH/MI), not CA (PUBINFO already has votes)');
  }
  const dirs = (process.env.OS_CSV_DIRS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!dirs.length) throw new Error('OS_CSV_DIRS required (comma-separated session-CSV top dirs)');

  const client = await connectClient();
  try {
    const loaded = new Set<string>((await client.query('SELECT id FROM bill WHERE state=$1', [st])).rows.map((r: any) => r.id));
    const legByPid = new Map<string, string>();
    for (const r of (await client.query('SELECT id FROM legislator WHERE state=$1', [st])).rows as any[]) {
      const pid = /:os:(.+)$/.exec(r.id)?.[1];
      if (pid) legByPid.set(pid, r.id);
    }
    console.log(`${st}: ${loaded.size} loaded bills, ${legByPid.size} legislators`);

    const eventsById = new Map<string, VEvent>();
    const eventByOcd = new Map<string, VEvent>();
    const recordsByKey = new Map<string, VRecord>();
    let totalVotes = 0;
    let skippedNoBill = 0;

    for (const top of dirs) {
      const stateDir = resolve(top, st);
      if (!existsSync(stateDir)) {
        console.warn(`  ! missing ${stateDir}`);
        continue;
      }
      const sessions = readdirSync(stateDir).filter((s) => existsSync(resolve(stateDir, s, `${st}_${s}_votes.csv`)));
      for (const session of sessions) {
        const dir = resolve(stateDir, session);
        const pfx = `${st}_${session}_`;

        const billMap = new Map<string, string>();
        for (const b of readCsv(resolve(dir, `${pfx}bills.csv`))) {
          if (b.id && b.identifier) billMap.set(b.id, `${st}:${b.session_identifier}:${String(b.identifier).replace(/\s+/g, '')}`);
        }
        const orgChamber = new Map<string, 'assembly' | 'senate' | null>();
        for (const o of readCsv(resolve(dir, `${pfx}organizations.csv`))) {
          if (o.id) orgChamber.set(o.id, chamberOf(o.classification));
        }

        for (const v of readCsv(resolve(dir, `${pfx}votes.csv`))) {
          totalVotes++;
          const myBill = billMap.get(v.bill_id);
          if (!myBill || !loaded.has(myBill)) {
            skippedNoBill++;
            continue;
          }
          const id = `${st}:${tail(v.id)}`;
          if (eventsById.has(id)) continue;
          const ev: VEvent = {
            id,
            billId: myBill,
            date: v.start_date || null,
            chamber:
              orgChamber.get(v.organization_id) ??
              (/senate/i.test(v.motion_text || '') ? 'senate' : /assembly|house/i.test(v.motion_text || '') ? 'assembly' : null),
            isFloor: /passage|reading|floor|third|concur/i.test(`${v.motion_classification ?? ''} ${v.motion_text ?? ''}`),
            motion: v.motion_text || null,
            result: v.result || null,
            ayes: 0,
            noes: 0,
            abstain: 0,
          };
          eventsById.set(id, ev);
          eventByOcd.set(v.id, ev);
        }

        for (const c of readCsv(resolve(dir, `${pfx}vote_counts.csv`))) {
          const ev = eventByOcd.get(c.vote_event_id);
          if (!ev) continue;
          const opt = mapOption(c.option);
          const n = Number.parseInt(c.value, 10) || 0;
          if (opt === 'yea') ev.ayes += n;
          else if (opt === 'nay') ev.noes += n;
          else ev.abstain += n;
        }

        for (const p of readCsv(resolve(dir, `${pfx}vote_people.csv`))) {
          if (!eventByOcd.has(p.vote_event_id)) continue;
          const voteEventId = `${st}:${tail(p.vote_event_id)}`;
          const name = p.voter_name || '?';
          const key = `${voteEventId}|${name.toLowerCase()}`;
          if (recordsByKey.has(key)) continue;
          recordsByKey.set(key, {
            voteEventId,
            legislatorId: legByPid.get(tail(p.voter_id)) ?? null,
            legislatorName: name,
            option: mapOption(p.option),
          });
        }
        console.log(`  ${session}: events ${eventsById.size}, records ${recordsByKey.size}`);
      }
    }

    const events = [...eventsById.values()];
    const records = [...recordsByKey.values()];
    const linked = records.filter((r) => r.legislatorId).length;
    console.log(
      `${st}: ${totalVotes} votes in CSV → kept ${events.length} events (${skippedNoBill} skipped: bill not in focused set), ` +
        `${records.length} vote records (${linked} linked to a member, ${records.length - linked} name-only)`,
    );

    if (DRY) {
      console.log('[DRY RUN] no writes — set IMPORT_APPLY=1 to load.');
      return;
    }

    await client.query('DELETE FROM vote_event WHERE state=$1', [st]); // cascades vote_record
    const ne = await batchInsert(
      client,
      `INSERT INTO vote_event (id, state, bill_id, date, chamber, is_floor, motion, result, ayes, noes, abstain, source) VALUES`,
      `ON CONFLICT (id) DO NOTHING`,
      11,
      (o) => `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5}::chamber,$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},'openstates')`,
      events.map((e) => [e.id, st, e.billId, e.date, e.chamber, e.isFloor, e.motion, e.result, e.ayes, e.noes, e.abstain]),
    );
    const nr = await batchInsert(
      client,
      `INSERT INTO vote_record (vote_event_id, legislator_id, legislator_name, option) VALUES`,
      `ON CONFLICT (vote_event_id, legislator_name) DO NOTHING`,
      4,
      (o) => `($${o + 1},$${o + 2},$${o + 3},$${o + 4}::vote_option)`,
      records.map((r) => [r.voteEventId, r.legislatorId, r.legislatorName, r.option]),
    );
    console.log(`✓ ${st}: inserted ${ne} vote events + ${nr} vote records.`);
  } finally {
    await client.end();
  }
}
