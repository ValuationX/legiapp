// Multi-state Phase 0 migration: add the `state` dimension and prefix California's
// existing IDs (CA:… / CA-…) so they stay globally unique alongside other states.
//
// SAFE BY DEFAULT: runs the whole thing in ONE transaction, verifies (row counts
// unchanged, zero orphaned FKs, all IDs prefixed), then ROLLS BACK unless APPLY=1.
// Neon blocks session_replication_role, so referencing FKs are made DEFERRABLE and
// deferred within the transaction while the PKs + FK columns are rewritten together.
//
//   DRY RUN (default):  DATABASE_URL=... node scripts/migrate-multistate.mjs
//   COMMIT:             APPLY=1 DATABASE_URL=... node scripts/migrate-multistate.mjs
import pg from 'pg';

const APPLY = process.env.APPLY === '1';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = (s) => c.query(s);
const n = async (s) => (await q(s)).rows[0].n;

const TABLES = ['legislator', 'committee', 'bill', 'bill_action', 'bill_subject', 'sponsorship',
  'vote_event', 'vote_record', 'committee_hearing', 'committee_membership', 'leadership_role',
  'member_position', 'district', 'calendar_event', 'statement'];

const STATE_TABLES = ['legislator', 'committee', 'bill', 'vote_event', 'district', 'calendar_event',
  'member_position', 'statement'];

// FKs that reference a table whose PK we rewrite → must be deferrable for the txn.
const DEFER_FKS = [
  ['bill_action', 'bill_action_bill_id_bill_id_fk'],
  ['bill_subject', 'bill_subject_bill_id_bill_id_fk'],
  ['sponsorship', 'sponsorship_bill_id_bill_id_fk'],
  ['sponsorship', 'sponsorship_legislator_id_legislator_id_fk'],
  ['vote_event', 'vote_event_bill_id_bill_id_fk'],
  ['vote_event', 'vote_event_committee_id_committee_id_fk'],
  ['committee_hearing', 'committee_hearing_bill_id_bill_id_fk'],
  ['committee_hearing', 'committee_hearing_committee_id_committee_id_fk'],
  ['committee_membership', 'committee_membership_committee_id_committee_id_fk'],
  ['committee_membership', 'committee_membership_legislator_id_legislator_id_fk'],
  ['leadership_role', 'leadership_role_legislator_id_legislator_id_fk'],
  ['vote_record', 'vote_record_legislator_id_legislator_id_fk'],
  ['vote_record', 'vote_record_vote_event_id_vote_event_id_fk'],
  ['statement', 'statement_legislator_id_legislator_id_fk'],
  ['calendar_event', 'calendar_event_committee_id_committee_id_fk'],
];

const sample = (await q(`SELECT id FROM bill LIMIT 1`)).rows[0]?.id;
if (sample && sample.startsWith('CA:')) {
  console.log('Already migrated (bill ids start with CA:). Nothing to do.');
  await c.end();
  process.exit(0);
}

const before = {};
for (const t of TABLES) before[t] = await n(`SELECT count(*)::int n FROM ${t}`);

await q('BEGIN');
try {
  for (const [t, name] of DEFER_FKS) await q(`ALTER TABLE ${t} ALTER CONSTRAINT ${name} DEFERRABLE INITIALLY IMMEDIATE`);
  await q('SET CONSTRAINTS ALL DEFERRED');

  // 1. add columns (nullable) + relax NOT NULL on district numbers (MA named districts)
  await q(`ALTER TABLE legislator ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE legislator ADD COLUMN IF NOT EXISTS district_label text`);
  await q(`ALTER TABLE legislator ADD COLUMN IF NOT EXISTS source_person_id text`);
  await q(`ALTER TABLE legislator ALTER COLUMN district DROP NOT NULL`);
  await q(`ALTER TABLE committee ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE bill ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE vote_event ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE district ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE district ADD COLUMN IF NOT EXISTS district_label text`);
  await q(`ALTER TABLE district ALTER COLUMN number DROP NOT NULL`);
  await q(`ALTER TABLE calendar_event ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE member_position ADD COLUMN IF NOT EXISTS state text`);
  await q(`ALTER TABLE statement ADD COLUMN IF NOT EXISTS state text`);

  // 2. backfill state + labels
  for (const t of STATE_TABLES) await q(`UPDATE ${t} SET state='CA'`);
  await q(`UPDATE legislator SET district_label = district::text WHERE district IS NOT NULL`);
  await q(`UPDATE district SET district_label = number::text WHERE number IS NOT NULL`);

  // 3. prefix IDs + every referencing FK column
  // legislator.id ← leadership_role, committee_membership, sponsorship, vote_record, statement,
  //                 member_position (no FK), district.current_legislator_id (no FK)
  await q(`UPDATE legislator SET id = 'CA:' || id`);
  await q(`UPDATE leadership_role SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE committee_membership SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE sponsorship SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE vote_record SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE statement SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE member_position SET legislator_id = 'CA:' || legislator_id WHERE legislator_id IS NOT NULL`);
  await q(`UPDATE district SET current_legislator_id = 'CA:' || current_legislator_id WHERE current_legislator_id IS NOT NULL`);
  // committee.id ← committee_membership, vote_event, committee_hearing, calendar_event
  await q(`UPDATE committee SET id = 'CA:' || id`);
  await q(`UPDATE committee_membership SET committee_id = 'CA:' || committee_id`);
  await q(`UPDATE vote_event SET committee_id = 'CA:' || committee_id WHERE committee_id IS NOT NULL`);
  await q(`UPDATE committee_hearing SET committee_id = 'CA:' || committee_id WHERE committee_id IS NOT NULL`);
  await q(`UPDATE calendar_event SET committee_id = 'CA:' || committee_id WHERE committee_id IS NOT NULL`);
  // bill.id ← bill_action, bill_subject, sponsorship, vote_event, committee_hearing, member_position
  await q(`UPDATE bill SET id = 'CA:' || id`);
  await q(`UPDATE bill_action SET bill_id = 'CA:' || bill_id`);
  await q(`UPDATE bill_subject SET bill_id = 'CA:' || bill_id`);
  await q(`UPDATE sponsorship SET bill_id = 'CA:' || bill_id`);
  await q(`UPDATE vote_event SET bill_id = 'CA:' || bill_id`);
  await q(`UPDATE committee_hearing SET bill_id = 'CA:' || bill_id WHERE bill_id IS NOT NULL`);
  await q(`UPDATE member_position SET bill_id = 'CA:' || bill_id WHERE bill_id IS NOT NULL`);
  // other PKs
  await q(`UPDATE bill_action SET id = 'CA:' || id`);
  await q(`UPDATE vote_event SET id = 'CA:' || id`);
  await q(`UPDATE vote_record SET vote_event_id = 'CA:' || vote_event_id`);
  await q(`UPDATE committee_hearing SET id = 'CA:' || id`);
  await q(`UPDATE district SET id = 'CA-' || id`); // district uses '-' separator
  // watchlist/alert targets (currently empty, future-proof)
  await q(`UPDATE watchlist SET target_id = 'CA:' || target_id WHERE target_type IN ('bill','legislator','committee')`);
  await q(`UPDATE alert SET target_id = 'CA:' || target_id WHERE target_type IN ('bill','legislator','committee')`);

  // Flush the deferred FK checks now (everything is consistent) so the following
  // ALTER TABLE / CREATE INDEX steps don't hit "pending trigger events".
  await q('SET CONSTRAINTS ALL IMMEDIATE');

  // 4. NOT NULL on state
  for (const t of STATE_TABLES) await q(`ALTER TABLE ${t} ALTER COLUMN state SET NOT NULL`);

  // 5. indexes
  await q(`DROP INDEX IF EXISTS legislator_natural_key`);
  await q(`DROP INDEX IF EXISTS legislator_chamber_idx`);
  await q(`CREATE UNIQUE INDEX legislator_natural_key ON legislator (state, session_year, chamber, district) WHERE source_person_id IS NULL`);
  await q(`CREATE UNIQUE INDEX legislator_source_key ON legislator (state, session_year, source_person_id) WHERE source_person_id IS NOT NULL`);
  await q(`CREATE INDEX legislator_state_chamber_idx ON legislator (state, chamber)`);
  await q(`DROP INDEX IF EXISTS committee_chamber_idx`);
  await q(`CREATE INDEX committee_state_chamber_idx ON committee (state, chamber)`);
  await q(`CREATE INDEX IF NOT EXISTS bill_state_session_idx ON bill (state, session_year)`);
  await q(`DROP INDEX IF EXISTS calendar_event_external_id_unique`);
  await q(`CREATE UNIQUE INDEX calendar_event_external_id_unique ON calendar_event (state, external_id)`);

  // ── verification ──────────────────────────────────────────────────────────
  const after = {};
  for (const t of TABLES) after[t] = await n(`SELECT count(*)::int n FROM ${t}`);
  const countOk = TABLES.every((t) => before[t] === after[t]);

  const orphans = {
    bill_action: await n(`SELECT count(*)::int n FROM bill_action x LEFT JOIN bill b ON b.id=x.bill_id WHERE b.id IS NULL`),
    bill_subject: await n(`SELECT count(*)::int n FROM bill_subject x LEFT JOIN bill b ON b.id=x.bill_id WHERE b.id IS NULL`),
    sponsorship_bill: await n(`SELECT count(*)::int n FROM sponsorship x LEFT JOIN bill b ON b.id=x.bill_id WHERE b.id IS NULL`),
    vote_event_bill: await n(`SELECT count(*)::int n FROM vote_event x LEFT JOIN bill b ON b.id=x.bill_id WHERE b.id IS NULL`),
    vote_record_ve: await n(`SELECT count(*)::int n FROM vote_record x LEFT JOIN vote_event v ON v.id=x.vote_event_id WHERE v.id IS NULL`),
    hearing_bill: await n(`SELECT count(*)::int n FROM committee_hearing x LEFT JOIN bill b ON b.id=x.bill_id WHERE x.bill_id IS NOT NULL AND b.id IS NULL`),
    cm_committee: await n(`SELECT count(*)::int n FROM committee_membership x LEFT JOIN committee c ON c.id=x.committee_id WHERE c.id IS NULL`),
    cm_legislator: await n(`SELECT count(*)::int n FROM committee_membership x LEFT JOIN legislator l ON l.id=x.legislator_id WHERE x.legislator_id IS NOT NULL AND l.id IS NULL`),
    sponsorship_leg: await n(`SELECT count(*)::int n FROM sponsorship x LEFT JOIN legislator l ON l.id=x.legislator_id WHERE x.legislator_id IS NOT NULL AND l.id IS NULL`),
    vote_record_leg: await n(`SELECT count(*)::int n FROM vote_record x LEFT JOIN legislator l ON l.id=x.legislator_id WHERE x.legislator_id IS NOT NULL AND l.id IS NULL`),
  };
  const badIds = {
    bill: await n(`SELECT count(*)::int n FROM bill WHERE id NOT LIKE 'CA:%'`),
    legislator: await n(`SELECT count(*)::int n FROM legislator WHERE id NOT LIKE 'CA:%'`),
    committee: await n(`SELECT count(*)::int n FROM committee WHERE id NOT LIKE 'CA:%'`),
    vote_event: await n(`SELECT count(*)::int n FROM vote_event WHERE id NOT LIKE 'CA:%'`),
    district: await n(`SELECT count(*)::int n FROM district WHERE id NOT LIKE 'CA-%'`),
  };
  const stateBad = await n(`SELECT count(*)::int n FROM bill WHERE state<>'CA'`);

  console.log('counts unchanged :', countOk);
  console.log('  before:', JSON.stringify(before));
  console.log('  after :', JSON.stringify(after));
  console.log('orphan FKs       :', JSON.stringify(orphans));
  console.log('bad id formats   :', JSON.stringify(badIds));
  console.log('non-CA bill rows :', stateBad);

  const allGood =
    countOk &&
    Object.values(orphans).every((v) => v === 0) &&
    Object.values(badIds).every((v) => v === 0) &&
    stateBad === 0;
  console.log('\nALL CHECKS PASS  :', allGood);

  if (!APPLY) {
    await q('ROLLBACK');
    console.log('>>> DRY RUN — rolled back, nothing saved. Re-run with APPLY=1 to commit.');
  } else if (!allGood) {
    await q('ROLLBACK');
    console.log('>>> CHECKS FAILED — rolled back, nothing saved.');
    process.exit(1);
  } else {
    await q('COMMIT');
    console.log('>>> COMMITTED — migration applied to the database.');
  }
} catch (e) {
  await q('ROLLBACK').catch(() => {});
  console.error('MIGRATION ERROR (rolled back):', e.message);
  process.exit(1);
}
await c.end();
