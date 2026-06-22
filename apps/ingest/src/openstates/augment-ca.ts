// Augment the existing PUBINFO California data with foreign-affairs bills (2022+) that
// the narrow published snapshot is missing, from Open States session CSVs. New bills get
// PUBINFO-compatible ids (CA:<session>0<MEASURE>, verified to match every prod CA id) so
// they MERGE with existing rows — no duplicates — preserving the PUBINFO bills, their
// roll-call votes, the roster, leadership, and member positions. Sponsors on the added
// bills are name-matched to the existing CA legislators so leaders' FA records fill in.
//
// FA-only by design: the existing recent-bill slice is left as-is. After this, run
// `foreign-affairs` to tag the newly-added bills. DRY by default; IMPORT_APPLY=1 writes.
//   DRY:    OS_CSV_DIRS="…CA dirs…" npm run ingest -- augment-ca
//   APPLY:  IMPORT_APPLY=1 DATABASE_URL=<neon> OS_CSV_DIRS="…" npm run ingest -- augment-ca
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { matchRegions } from '@legiapp/shared';
import { connectClient } from '../db.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DRY = process.env.IMPORT_APPLY !== '1';
const MIN_SESSION = '20212022'; // "2022 onward" — the 2021-2022 biennium covers 2022

function readCsv(path: string): any[] {
  if (!existsSync(path)) return [];
  return parse(readFileSync(path), { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}

const caBillId = (session: string, identifier: string) => `CA:${session}0${identifier.replace(/\s+/g, '')}`;
const chamberOf = (c?: string) => (c === 'lower' ? 'assembly' : c === 'upper' ? 'senate' : null);

interface Bill {
  identifier: string;
  title: string;
  session: string;
  chamber: 'assembly' | 'senate' | null;
  abstract: string | null;
  sponsors: { name: string; primary: boolean }[];
  firstDate: string | null;
  lastDate: string | null;
  lastDesc: string | null;
  regions: string[];
}

export async function runAugmentCa(): Promise<void> {
  const dirs = (process.env.OS_CSV_DIRS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!dirs.length) throw new Error('OS_CSV_DIRS required (comma-separated CA session-CSV top dirs)');

  const bills = new Map<string, Bill>();
  for (const top of dirs) {
    const stateDir = resolve(top, 'CA');
    if (!existsSync(stateDir)) {
      console.warn(`  ! missing ${stateDir}`);
      continue;
    }
    const sessions = readdirSync(stateDir).filter((s) => existsSync(resolve(stateDir, s, `CA_${s}_bills.csv`)));
    for (const session of sessions) {
      // Only regular biennial sessions (8-digit YYYYYYYY) ≥ 2021-2022. Special sessions
      // (e.g. "20232024 Special Session 1") use a different PUBINFO id code → skipped.
      if (!/^\d{8}$/.test(session) || session < MIN_SESSION) {
        console.log(`  • skip ${session}`);
        continue;
      }
      const dir = resolve(stateDir, session);
      const pfx = `CA_${session}_`;
      for (const r of readCsv(resolve(dir, `${pfx}bills.csv`))) {
        if (!r.id || !r.identifier) continue;
        bills.set(r.id, {
          identifier: r.identifier,
          title: r.title ?? '',
          session,
          chamber: chamberOf(r.organization_classification),
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
        if (b) b.sponsors.push({ name: s.name ?? '', primary: String(s.primary).toLowerCase() === 'true' });
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
  }

  const fa: Bill[] = [];
  for (const b of bills.values()) {
    b.regions = matchRegions(`${b.title} ${b.abstract ?? ''}`);
    if (b.regions.length) fa.push(b);
  }
  console.log(`parsed ${bills.size} bills → ${fa.length} foreign-affairs (2022+)`);
  if (DRY) {
    console.log('[DRY RUN] no writes — set IMPORT_APPLY=1 to load. Sample:');
    for (const b of fa.slice(0, 12)) console.log(`  ${caBillId(b.session, b.identifier)}  ${b.identifier}  [${b.regions.join(',')}]  ${b.title.slice(0, 60)}`);
    return;
  }

  const client = await connectClient();
  try {
    // Name → existing CA legislator id. Match by full name, else by surname when unique
    // across the whole active roster (avoids a chamber assumption for cross-house coauthors).
    const legRows = (
      await client.query<{ id: string; ln: string; fn: string }>(
        `SELECT id, lower(coalesce(last_name,'')) AS ln,
                lower(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) AS fn
         FROM legislator WHERE state='CA' AND active = true`,
      )
    ).rows;
    const byFull = new Map<string, string>();
    const byLast = new Map<string, string>();
    const dupLast = new Set<string>();
    for (const l of legRows) {
      const fn = (l.fn ?? '').trim();
      if (fn) byFull.set(fn, l.id);
      if (l.ln) {
        if (byLast.has(l.ln)) dupLast.add(l.ln);
        else byLast.set(l.ln, l.id);
      }
    }
    const matchLeg = (name: string): string | null => {
      const nm = (name ?? '').trim().toLowerCase();
      if (byFull.has(nm)) return byFull.get(nm)!;
      const last = nm.split(/\s+/).pop() ?? '';
      if (last && !dupLast.has(last) && byLast.has(last)) return byLast.get(last)!;
      return null;
    };

    let inserted = 0;
    let existed = 0;
    let spons = 0;
    let linked = 0;
    for (const b of fa) {
      const id = caBillId(b.session, b.identifier);
      const mt = b.identifier.split(/\s+/)[0] ?? '?';
      const mn = Number.parseInt(b.identifier.replace(/\D/g, ''), 10) || 0;
      const res = await client.query(
        `INSERT INTO bill (id, state, session_year, session, measure_type, measure_num, identifier,
                           chamber_of_origin, title, summary, digest, status, last_action_date, introduced_date, source)
         VALUES ($1,'CA',$2,$2,$3,$4,$5,$6::chamber,$7,$8,$8,$9,$10,$11,'openstates')
         ON CONFLICT (id) DO NOTHING`,
        [id, b.session, mt, mn, b.identifier, b.chamber, b.title || null, b.abstract, b.lastDesc, b.lastDate,
         b.firstDate ? b.firstDate.slice(0, 10) : null],
      );
      if (res.rowCount === 1) {
        inserted++;
        for (const sp of b.sponsors) {
          const legId = matchLeg(sp.name);
          if (legId) linked++;
          await client.query(
            `INSERT INTO sponsorship (bill_id, legislator_id, legislator_name, type, source)
             VALUES ($1,$2,$3,$4::sponsor_type,'openstates') ON CONFLICT (bill_id, legislator_name, type) DO NOTHING`,
            [id, legId, sp.name || '?', sp.primary ? 'primary' : 'co'],
          );
          spons++;
        }
      } else {
        existed++;
      }
    }
    console.log(`✓ CA augment: +${inserted} new FA bills (${existed} already present), ${spons} sponsorships (${linked} linked to a member).`);
    console.log('  Next: run `foreign-affairs` to tag the new bills.');
  } finally {
    await client.end();
  }
}
