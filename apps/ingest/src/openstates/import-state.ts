// Focused, multi-state PRIMARY importer (Open States). Unlike openstates/run.ts
// (CA enrichment only), this CREATES legislator + bill rows for a non-PUBINFO state,
// honoring the project's FOCUSED data scope:
//   • ALL foreign-affairs bills (FA_REGIONS) from the 2022 session onward
//   • plus the most recent/active bills of the current session
//   • plus the full current roster (legislators) + committees (Phase 2)
//
// Sources (both free, no rate-limit problem at this scope):
//   • Legislators  → OpenStates People GitHub repo  data/<st>/legislature/*.yml
//   • Bills        → Open States v3 API (targeted q= searches; list responses already
//                    include sponsorships + abstracts, so no per-bill detail calls)
//
// DRY RUN by default (fetch + parse + report counts, NO writes). IMPORT_APPLY=1 writes.
//   DRY:    OPENSTATES_API_KEY=… node --import tsx apps/ingest/src/index.ts state NY
//   APPLY:  IMPORT_APPLY=1 OPENSTATES_API_KEY=… DATABASE_URL=… ... state NY
import yaml from 'js-yaml';
import type pg from 'pg';
import { FA_REGIONS, getState, type StateConfig } from '@legiapp/shared';
import { connectClient } from '../db.js';
import { paginate } from './client.js';
import { importBillsFromCsv } from './import-csv.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DRY = process.env.IMPORT_APPLY !== '1';
const MIN_SESSION_YEAR = 2021; // "2022 onward" — include the 2021-2022 session (covers 2022)
const RECENT_LIMIT = 250; // cap on recent non-FA bills per the focused scope

const lastName = (n?: string) => (n ?? '').trim().split(/\s+/).pop() ?? '';
const ocdShort = (id?: string) => (id ?? '').split('/').pop() ?? '';
const chamberOf = (c?: string) => (c === 'upper' ? 'senate' : c === 'lower' ? 'assembly' : null);
const sessionStartYear = (s?: string) => Number.parseInt(String(s ?? '').slice(0, 4), 10) || 0;
// Some states use ordinal session names ("104th", "57th Legislature …") that don't start
// with a year, so also derive the year from the bill's action dates for the FA 2022+ filter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const billYear = (b: any) =>
  Number.parseInt(String(b?.latest_action_date || b?.first_action_date || b?.updated_at || '').slice(0, 4), 10) || 0;

function parseMeasure(identifier: string): { measureType: string; measureNum: number } {
  const m = identifier.replace(/\s+/g, ' ').trim().match(/^([A-Za-z.]+)\s*0*(\d+)/);
  return { measureType: m?.[1] ?? (identifier.split(/\s/)[0] || '?'), measureNum: m ? Number.parseInt(m[2] ?? '0', 10) : 0 };
}

const legId = (st: StateConfig, sessionYear: string, personId: string) =>
  `${st.code}:${sessionYear}:os:${personId}`;
const billId = (st: StateConfig, session: string, identifier: string) =>
  `${st.code}:${session}:${identifier.replace(/\s+/g, '')}`;

// Strong search terms per FA region (the regex tagger in Phase 2 refines precisely;
// these just gather candidates cheaply from the API).
const SEARCH_TERMS: Record<string, string[]> = {
  ukraine: ['Ukraine'],
  russia: ['Russia'],
  israel: ['Israel'],
  holocaust: ['Holocaust'],
  iran: ['Iran'],
  china: ['China'],
  taiwan: ['Taiwan'],
  general: ['genocide'],
};

interface PersonYaml {
  id?: string;
  name?: string;
  party?: string | { name?: string; end_date?: string }[];
  email?: string;
  image?: string;
  offices?: { classification?: string; address?: string; voice?: string }[];
  roles?: { type?: string; district?: string; end_date?: string }[];
}

// OpenStates people YAML stores party as a list of {name, end_date?} (NY uses fusion
// lines like "Democratic/Working Families"); take the current (no end_date) entry.
function partyName(p: PersonYaml['party']): string | null {
  if (typeof p === 'string') return p || null;
  if (Array.isArray(p)) return p.find((x) => !x.end_date)?.name ?? p[0]?.name ?? null;
  return null;
}

// ── Legislators (current roster) from the public People repo ──────────────────
async function importLegislators(client: pg.Client | null, st: StateConfig, sessionYear: string) {
  const dir = `https://api.github.com/repos/openstates/people/contents/data/${st.code.toLowerCase()}/legislature`;
  const res = await fetch(dir, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'legiapp-ingest' } });
  if (!res.ok) throw new Error(`GitHub listing ${st.code}: ${res.status}`);
  const files = ((await res.json()) as any[]).filter((f) => f.type === 'file' && f.name.endsWith('.yml'));
  let count = 0;
  const byChamber: Record<string, number> = { assembly: 0, senate: 0 };
  const pids = new Set<string>();
  for (const f of files) {
    if (!f.download_url) continue;
    const raw = await fetch(f.download_url, { headers: { 'User-Agent': 'legiapp-ingest' } });
    if (!raw.ok) continue;
    const y = yaml.load(await raw.text()) as PersonYaml;
    const role = (y.roles ?? []).find((r) => !r.end_date && (r.type === 'lower' || r.type === 'upper'));
    if (!role) continue;
    const chamber = role.type === 'lower' ? 'assembly' : 'senate';
    const districtNum = Number.parseInt(role.district ?? '', 10);
    const pid = ocdShort(y.id);
    if (!pid) continue;
    pids.add(pid);
    const offices = y.offices ?? [];
    const cap = offices.find((o) => o.classification === 'capitol') ?? offices[0];
    const photo = y.image && /^https?:\/\//.test(y.image) ? y.image : null;
    if (!DRY && client) {
      await client.query(
        `INSERT INTO legislator (id, state, source_person_id, session_year, chamber, district, district_label,
                                 full_name, last_name, party, email, phone, office, photo_url, active, source)
         VALUES ($1,$2,$3,$4,$5::chamber,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,'openstates')
         ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, party=EXCLUDED.party,
           email=EXCLUDED.email, phone=EXCLUDED.phone, office=EXCLUDED.office,
           photo_url=EXCLUDED.photo_url, district=EXCLUDED.district, district_label=EXCLUDED.district_label,
           last_verified=now()`,
        [legId(st, sessionYear, pid), st.code, pid, sessionYear, chamber,
         Number.isFinite(districtNum) ? districtNum : null, role.district ?? null,
         y.name ?? '(Unknown)', lastName(y.name), partyName(y.party), y.email ?? null,
         cap?.voice ?? null, cap?.address ?? null, photo],
      );
    }
    byChamber[chamber] = (byChamber[chamber] ?? 0) + 1;
    count++;
  }
  return { count, byChamber, pids };
}

// Valid roster person-ids already in the DB — used when SKIP_LEGS=1 so sponsorship
// FKs still resolve without re-fetching the roster.
async function rosterPidsFromDb(client: pg.Client | null, st: StateConfig): Promise<Set<string>> {
  if (!client) return new Set();
  const r = await client.query(
    `SELECT source_person_id AS pid FROM legislator WHERE state = $1 AND source_person_id IS NOT NULL`,
    [st.code],
  );
  return new Set((r.rows as any[]).map((x) => x.pid));
}

// ── Bills (focused: FA 2022+ across sessions, then recent active) ─────────────
async function upsertBill(
  client: pg.Client | null,
  st: StateConfig,
  b: any,
  region: string | null,
  currentSessionYear: string,
  rosterPids: Set<string>,
) {
  const identifier: string = b.identifier;
  if (!identifier || !b.session) return null;
  const id = billId(st, b.session, identifier);
  const billSession: string = b.session; // OS session string, e.g. "2025-2026"
  const { measureType, measureNum } = parseMeasure(identifier);
  const summary = b.abstracts?.[0]?.abstract ?? null;
  if (!DRY && client) {
    await client.query(
      `INSERT INTO bill (id, state, session_year, session, measure_type, measure_num, identifier,
                         chamber_of_origin, title, summary, digest, status, last_action_date, introduced_date, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::chamber,$9,$10,$10,$11,$12,$13,'openstates')
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, digest=EXCLUDED.digest,
         status=EXCLUDED.status, last_action_date=EXCLUDED.last_action_date, last_verified=now()`,
      [id, st.code, billSession, billSession, measureType, measureNum, identifier,
       chamberOf(b.from_organization?.classification), b.title ?? null, summary,
       b.latest_action_description ?? null, b.latest_action_date || b.updated_at || null, // `||` so empty-string dates → null
       b.first_action_date ? String(b.first_action_date).slice(0, 10) : null],
    );
    await client.query(`DELETE FROM sponsorship WHERE bill_id=$1`, [id]);
    for (const sp of b.sponsorships ?? []) {
      const pid = ocdShort(sp.person?.id);
      await client.query(
        `INSERT INTO sponsorship (bill_id, legislator_id, legislator_name, type, source)
         VALUES ($1,$2,$3,$4::sponsor_type,'openstates') ON CONFLICT (bill_id, legislator_name, type) DO NOTHING`,
        [id, pid && rosterPids.has(pid) ? legId(st, currentSessionYear, pid) : null,
         sp.name ?? sp.person?.name ?? '?', sp.classification === 'primary' || sp.primary ? 'primary' : 'co'],
      );
    }
    // tag the foreign-affairs region (precise re-tagging happens in the FA step)
    if (region) {
      await client.query(
        `INSERT INTO bill_subject (bill_id, subject, source) VALUES ($1,$2,'foreign-affairs')
         ON CONFLICT DO NOTHING`,
        [id, region],
      );
    }
  }
  return id;
}

async function importBills(client: pg.Client | null, st: StateConfig, sessionYear: string, rosterPids: Set<string>) {
  const seen = new Set<string>();
  let fa = 0;
  let recent = 0;
  const params = { jurisdiction: st.openStatesJurisdiction, include: ['sponsorships', 'abstracts'], per_page: 20 }; // OS v3 /bills caps per_page at 20

  // 1) Foreign-affairs bills, all sessions >= 2022, via targeted searches
  for (const region of FA_REGIONS) {
    for (const term of SEARCH_TERMS[region.key] ?? [region.label]) {
      for await (const b of paginate<any>('/bills', { ...params, q: term, sort: 'latest_action_desc' })) {
        if (Math.max(sessionStartYear(b.session), billYear(b)) < MIN_SESSION_YEAR) continue;
        const id = billId(st, b.session, b.identifier ?? '');
        if (seen.has(id)) continue;
        seen.add(id);
        await upsertBill(client, st, b, region.key, sessionYear, rosterPids);
        fa++;
      }
    }
  }

  // 2) Recent/active bills of the CURRENT session (bounded) — the non-FA slice
  let n = 0;
  for await (const b of paginate<any>('/bills', { ...params, sort: 'latest_action_desc' })) {
    if (n++ >= RECENT_LIMIT) break;
    const id = billId(st, b.session ?? '', b.identifier ?? '');
    if (seen.has(id)) continue;
    seen.add(id);
    await upsertBill(client, st, b, null, sessionYear, rosterPids);
    recent++;
  }
  return { fa, recent, total: seen.size };
}

// ── Committees + memberships (rosters + chairs) from the People repo ───────────
async function importCommittees(
  client: pg.Client | null,
  st: StateConfig,
  sessionYear: string,
  rosterPids: Set<string>,
) {
  const dir = `https://api.github.com/repos/openstates/people/contents/data/${st.code.toLowerCase()}/committees`;
  const res = await fetch(dir, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'legiapp-ingest' } });
  if (!res.ok) {
    console.warn(`  committees: GitHub listing ${st.code}: ${res.status} (skipped)`);
    return { committees: 0, memberships: 0 };
  }
  const files = ((await res.json()) as any[]).filter((f) => f.type === 'file' && f.name.endsWith('.yml'));
  let committees = 0;
  let memberships = 0;
  for (const f of files) {
    if (!f.download_url) continue;
    const raw = await fetch(f.download_url, { headers: { 'User-Agent': 'legiapp-ingest' } });
    if (!raw.ok) continue;
    const c = yaml.load(await raw.text()) as any;
    if (c?.classification !== 'committee') continue; // skip caucuses / task forces
    const cid = `${st.code}:cmte:${ocdShort(c.id)}`;
    const chamber = c.chamber === 'lower' ? 'assembly' : c.chamber === 'upper' ? 'senate' : null;
    const members = (c.members ?? []) as { name?: string; role?: string; person_id?: string }[];
    if (!DRY && client) {
      await client.query(
        `INSERT INTO committee (id, state, name, chamber, type, source)
         VALUES ($1,$2,$3,$4::chamber,$5,'openstates')
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, chamber=EXCLUDED.chamber, last_verified=now()`,
        [cid, st.code, c.name ?? '(Unknown committee)', chamber, chamber ? 'standing' : 'joint'],
      );
      await client.query(`DELETE FROM committee_membership WHERE committee_id=$1`, [cid]);
      for (const m of members) {
        const pid = ocdShort(m.person_id);
        const r = (m.role ?? '').toLowerCase();
        const role = r.includes('vice') ? 'vice_chair' : r.includes('chair') ? 'chair' : 'member';
        await client.query(
          `INSERT INTO committee_membership (committee_id, legislator_id, role, source)
           VALUES ($1,$2,$3::committee_role,'openstates') ON CONFLICT (committee_id, legislator_id) DO NOTHING`,
          [cid, pid && rosterPids.has(pid) ? legId(st, sessionYear, pid) : null, role],
        );
        memberships++;
      }
    } else {
      memberships += members.length;
    }
    committees++;
  }
  return { committees, memberships };
}

export async function runStateImport(code: string): Promise<void> {
  const st = getState(code);
  if (!st) throw new Error(`Unknown state: ${code}`);
  if (st.hasPubinfo) throw new Error(`${st.code} uses PUBINFO — run \`pubinfo\`, not the state importer.`);
  const csvDirs = (process.env.OS_CSV_DIRS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const skipBills = process.env.SKIP_BILLS === '1'; // committees + roster only (People repo, no CSV/key)
  if (!skipBills && !csvDirs.length && !process.env.OPENSTATES_API_KEY)
    throw new Error('OPENSTATES_API_KEY required (or set OS_CSV_DIRS for the bulk-CSV path)');
  const sessionYear = '2025-2026'; // current session for the source-fed states

  console.log(`${DRY ? '[DRY RUN] ' : ''}Importing ${st.name} (${st.code})…`);
  const client = DRY ? null : await connectClient();
  try {
    let rosterPids = new Set<string>();
    if (process.env.SKIP_LEGS !== '1') {
      const legs = await importLegislators(client, st, sessionYear);
      rosterPids = legs.pids;
      console.log(`  legislators: ${legs.count}  (assembly ${legs.byChamber.assembly} / senate ${legs.byChamber.senate})`);
    } else {
      rosterPids = await rosterPidsFromDb(client, st);
      console.log(`  legislators: skipped (SKIP_LEGS=1; ${rosterPids.size} existing in DB)`);
    }
    if (skipBills) {
      console.log('  bills: skipped (SKIP_BILLS=1)');
    } else {
      if (!DRY && client) {
        // Clear this state's existing foreign-affairs tags so re-runs don't accumulate
        // duplicates (bill_subject has no unique constraint; tags are re-added below).
        await client.query(
          `DELETE FROM bill_subject WHERE source = 'foreign-affairs'
             AND bill_id IN (SELECT id FROM bill WHERE state = $1)`,
          [st.code],
        );
      }
      const bills = csvDirs.length
        ? await importBillsFromCsv(client, st, csvDirs, !DRY, sessionYear, rosterPids)
        : await importBills(client, st, sessionYear, rosterPids);
      console.log(`  bills: ${bills.total}  (foreign-affairs ${bills.fa} + recent ${bills.recent})`);
    }

    const cmt = await importCommittees(client, st, sessionYear, rosterPids);
    console.log(`  committees: ${cmt.committees}  (memberships ${cmt.memberships})`);

    console.log(DRY ? '[DRY RUN] no writes — set IMPORT_APPLY=1 to load.' : `✓ ${st.code} imported.`);
  } finally {
    if (client) await client.end();
  }
}
