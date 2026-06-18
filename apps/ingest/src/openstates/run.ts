import type pg from 'pg';
import { connectClient } from '../db.js';
import { hasOpenStatesKey, jurisdiction, paginate } from './client.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const lastName = (name: string | undefined) => (name ?? '').trim().split(/\s+/).pop() ?? '';
const chamberOf = (cls: string | undefined) =>
  cls === 'upper' ? 'senate' : cls === 'lower' ? 'assembly' : null;

/** Bill subjects / issue-area tags (PUBINFO lacks these). */
async function ingestSubjects(client: pg.Client, session: string): Promise<number> {
  await client.query(`TRUNCATE bill_subject RESTART IDENTITY`);
  let n = 0;
  for await (const b of paginate<any>('/bills', { jurisdiction: jurisdiction(), session, per_page: 20 })) {
    const subjects: string[] = b.subject ?? [];
    if (!subjects.length || !b.identifier) continue;
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM bill WHERE identifier = $1 AND session_year = $2 LIMIT 1`,
      [b.identifier, session],
    );
    if (!rows[0]) continue;
    for (const s of subjects) {
      await client.query(`INSERT INTO bill_subject (bill_id, subject, source) VALUES ($1, $2, 'openstates')`, [
        rows[0].id,
        s,
      ]);
      n++;
    }
  }
  return n;
}

/** Legislator contact details (email/phone/office) — PUBINFO has none. */
async function ingestContact(client: pg.Client): Promise<number> {
  let n = 0;
  for await (const p of paginate<any>('/people', { jurisdiction: jurisdiction(), include: ['offices'], per_page: 50 })) {
    const role = p.current_role;
    const chamber = chamberOf(role?.org_classification);
    const district = Number.parseInt(String(role?.district ?? ''), 10);
    if (!chamber || !Number.isFinite(district)) continue;
    const offices: any[] = p.offices ?? [];
    const cap = offices.find((o) => /capitol/i.test(`${o.name ?? ''}${o.classification ?? ''}`)) ?? offices[0];
    const email = p.email ?? offices.map((o) => o.email).find(Boolean) ?? null;
    const res = await client.query(
      `UPDATE legislator SET email = COALESCE($3, email), phone = COALESCE($4, phone),
              office = COALESCE($5, office), website = COALESCE($6, website), last_verified = now()
       WHERE chamber = $1 AND district = $2 AND active = true`,
      [chamber, district, email, cap?.voice ?? null, cap?.address ?? null, p.openstates_url ?? null],
    );
    n += res.rowCount ?? 0;
  }
  return n;
}

/** Committee rosters + chair flags. */
async function ingestCommittees(client: pg.Client): Promise<{ committees: number; members: number }> {
  await client.query(`DELETE FROM committee_membership WHERE source = 'openstates'`);
  let committees = 0;
  let members = 0;
  for await (const c of paginate<any>('/committees', { jurisdiction: jurisdiction(), include: ['memberships'], per_page: 20 })) {
    const chamber = chamberOf(c.classification ?? c.chamber);
    if (!chamber || !c.name) continue;
    let { rows } = await client.query<{ id: string }>(
      `SELECT id FROM committee WHERE chamber = $1 AND lower(name) = lower($2) LIMIT 1`,
      [chamber, c.name],
    );
    let cid = rows[0]?.id;
    if (!cid) {
      cid = `os-${c.id}`;
      await client.query(
        `INSERT INTO committee (id, name, chamber, type, source) VALUES ($1, $2, $3::chamber, 'standing', 'openstates')
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [cid, c.name, chamber],
      );
      committees++;
    }
    for (const m of c.memberships ?? []) {
      const r = String(m.role ?? '').toLowerCase();
      const role = r.includes('chair') ? (r.includes('vice') ? 'vice_chair' : 'chair') : 'member';
      const name = m.person_name ?? m.person?.name;
      const leg = (
        await client.query<{ id: string }>(
          `SELECT id FROM legislator WHERE chamber = $1 AND active = true
             AND (lower(last_name) = lower($2) OR lower(full_name) = lower($3)) LIMIT 1`,
          [chamber, lastName(name), name ?? ''],
        )
      ).rows[0];
      if (!leg) continue; // skip names we can't attribute (keeps rosters clean)
      await client.query(
        `INSERT INTO committee_membership (committee_id, legislator_id, role, source)
         VALUES ($1, $2, $3::committee_role, 'openstates')
         ON CONFLICT (committee_id, legislator_id) DO UPDATE SET role = EXCLUDED.role`,
        [cid, leg.id, role],
      );
      members++;
    }
  }
  return { committees, members };
}

export async function runOpenStates(): Promise<void> {
  if (!hasOpenStatesKey()) {
    console.log('• OPENSTATES_API_KEY not set — skipping Open States enrichment (subjects/contact/rosters).');
    return;
  }
  const client = await connectClient();
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('openstates', 'enrich', 'running') RETURNING id`,
  );
  const runId = rows[0]!.id;
  try {
    const { rows: s } = await client.query<{ m: string }>(`SELECT max(session_year) AS m FROM bill`);
    const session = s[0]?.m ?? '20252026';

    console.log('• Open States: committee rosters…');
    const cm = await ingestCommittees(client);
    console.log(`  ↳ committees +${cm.committees}, memberships ${cm.members}`);
    console.log('• Open States: legislator contact…');
    const contact = await ingestContact(client);
    console.log(`  ↳ contact updated for ${contact}`);
    console.log('• Open States: bill subjects…');
    const subjects = await ingestSubjects(client, session);
    console.log(`  ↳ subject tags ${subjects}`);

    const stats = { committees: cm.committees, memberships: cm.members, contact, subjects };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [runId, stats]);
    console.log('✓ Open States enrichment complete:', stats);
  } catch (err) {
    await client.query(`UPDATE ingest_run SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [
      runId,
      String((err as Error)?.message ?? err),
    ]);
    throw err;
  } finally {
    await client.end();
  }
}
