// Fast bulk importer for Open States "session CSV" exports
// (open.pluralpolicy.com/data/session-csv). No API, no rate limit: parse the CSVs
// locally, filter to the FOCUSED scope (all foreign-affairs bills from 2022 onward
// across the provided sessions, plus the recent/active bills of the latest session),
// and insert only that small subset.
//
// Directory layout (as downloaded): <topDir>/<ST>/<session>/<ST>_<session>_<file>.csv
// Provide one topDir per session via OS_CSV_DIRS (comma-separated).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import type pg from 'pg';
import { matchRegions, type StateConfig } from '@legiapp/shared';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MIN_SESSION_YEAR = 2021; // "2022 onward" includes the 2021-2022 session
const RECENT_LIMIT = 400; // cap on recent non-FA bills (the focused "other bills" slice)

function readCsv(path: string): any[] {
  if (!existsSync(path)) return [];
  return parse(readFileSync(path), { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}

interface OsBill {
  identifier: string;
  title: string;
  session: string;
  chamber: 'assembly' | 'senate' | null;
  abstract: string | null;
  sponsors: { name: string; personId: string; primary: boolean }[];
  firstDate: string | null;
  lastDate: string | null;
  lastDesc: string | null;
  regions: string[];
}

export async function importBillsFromCsv(
  client: pg.Client | null,
  st: StateConfig,
  topDirs: string[],
  apply: boolean,
  currentSessionYear: string,
  rosterPids: Set<string>,
): Promise<{ parsed: number; fa: number; recent: number; total: number }> {
  const bills = new Map<string, OsBill>();

  for (const top of topDirs) {
    const stateDir = resolve(top, st.code);
    if (!existsSync(stateDir)) {
      console.warn(`  ! missing ${stateDir}`);
      continue;
    }
    const session = readdirSync(stateDir).find((s) => /^\d{4}-\d{4}$/.test(s));
    if (!session || Number.parseInt(session.slice(0, 4), 10) < MIN_SESSION_YEAR) {
      console.log(`  • skip ${top} (session ${session ?? '?'} < ${MIN_SESSION_YEAR})`);
      continue;
    }
    const dir = resolve(stateDir, session);
    const pfx = `${st.code}_${session}_`;

    for (const r of readCsv(resolve(dir, `${pfx}bills.csv`))) {
      if (!r.id || !r.identifier) continue;
      bills.set(r.id, {
        identifier: r.identifier,
        title: r.title ?? '',
        session,
        chamber:
          r.organization_classification === 'lower'
            ? 'assembly'
            : r.organization_classification === 'upper'
              ? 'senate'
              : null,
        abstract: null,
        sponsors: [],
        firstDate: null,
        lastDate: null,
        lastDesc: null,
        regions: [],
      });
    }
    for (const a of readCsv(resolve(dir, `${pfx}bill_abstracts.csv`))) {
      const b = bills.get(a.bill_id);
      if (b && !b.abstract) b.abstract = a.abstract ?? null;
    }
    for (const s of readCsv(resolve(dir, `${pfx}bill_sponsorships.csv`))) {
      const b = bills.get(s.bill_id);
      if (!b) continue;
      b.sponsors.push({
        name: s.name ?? '',
        personId: (s.person_id ?? '').split('/').pop() ?? '',
        primary: String(s.primary).toLowerCase() === 'true',
      });
    }
    for (const ac of readCsv(resolve(dir, `${pfx}bill_actions.csv`))) {
      const b = bills.get(ac.bill_id);
      if (!b || !ac.date) continue;
      if (!b.firstDate || ac.date < b.firstDate) b.firstDate = ac.date;
      if (!b.lastDate || ac.date > b.lastDate) {
        b.lastDate = ac.date;
        b.lastDesc = ac.description ?? null;
      }
    }
    console.log(`  staged ${session}`);
  }

  // Classify foreign-affairs (regex over title + abstract) and pick the recent slice.
  const latestSession = [...bills.values()].reduce((m, b) => (b.session > m ? b.session : m), '');
  const fa: OsBill[] = [];
  const recentPool: OsBill[] = [];
  for (const b of bills.values()) {
    b.regions = matchRegions(`${b.title} ${b.abstract ?? ''}`);
    if (b.regions.length) fa.push(b);
    else if (b.session === latestSession) recentPool.push(b);
  }
  recentPool.sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? ''));
  const recent = recentPool.slice(0, RECENT_LIMIT);
  const finalSet = [...fa, ...recent];

  console.log(`  parsed ${bills.size} bills → selected ${finalSet.length} (foreign-affairs ${fa.length} + recent ${recent.length})`);
  if (!apply || !client) return { parsed: bills.size, fa: fa.length, recent: recent.length, total: finalSet.length };

  for (const b of finalSet) {
    const id = `${st.code}:${b.session}:${b.identifier.replace(/\s+/g, '')}`;
    const measureType = b.identifier.split(/\s+/)[0] ?? '?';
    const measureNum = Number.parseInt(b.identifier.replace(/\D/g, ''), 10) || 0;
    await client.query(
      `INSERT INTO bill (id, state, session_year, session, measure_type, measure_num, identifier, chamber_of_origin,
                         title, summary, digest, status, last_action_date, introduced_date, source)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7::chamber,$8,$9,$9,$10,$11,$12,'openstates')
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, digest=EXCLUDED.digest,
         status=EXCLUDED.status, last_action_date=EXCLUDED.last_action_date, last_verified=now()`,
      [id, st.code, b.session, measureType, measureNum, b.identifier, b.chamber, b.title || null,
       b.abstract, b.lastDesc, b.lastDate, b.firstDate ? b.firstDate.slice(0, 10) : null],
    );
    await client.query(`DELETE FROM sponsorship WHERE bill_id=$1`, [id]);
    for (const sp of b.sponsors) {
      await client.query(
        `INSERT INTO sponsorship (bill_id, legislator_id, legislator_name, type, source)
         VALUES ($1,$2,$3,$4::sponsor_type,'openstates') ON CONFLICT (bill_id, legislator_name, type) DO NOTHING`,
        // Only link to a legislator row that exists (current roster); historical
        // sponsors who left office keep name-only (FK is enforced).
        [id, sp.personId && rosterPids.has(sp.personId) ? `${st.code}:${currentSessionYear}:os:${sp.personId}` : null,
         sp.name || '?', sp.primary ? 'primary' : 'co'],
      );
    }
    for (const region of b.regions) {
      await client.query(
        `INSERT INTO bill_subject (bill_id, subject, source) VALUES ($1,$2,'foreign-affairs') ON CONFLICT DO NOTHING`,
        [id, region],
      );
    }
  }
  return { parsed: bills.size, fa: fa.length, recent: recent.length, total: finalSet.length };
}
