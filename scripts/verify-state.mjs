// Ground-truth per-state row counts straight from the DB (bypasses the API).
// Usage: DATABASE_URL=… node scripts/verify-state.mjs
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const c = new pg.Client({ connectionString: url });
await c.connect();
const q = async (sql, p = []) => (await c.query(sql, p)).rows;

console.log('legislators by state:', await q(`SELECT state, count(*)::int n FROM legislator GROUP BY state ORDER BY state`));
console.log('bills by state:', await q(`SELECT state, count(*)::int n FROM bill GROUP BY state ORDER BY state`));
console.log(
  'bills by state+session:',
  await q(`SELECT state, session_year, count(*)::int n FROM bill GROUP BY state, session_year ORDER BY state, session_year`),
);
console.log(
  'FA-tagged bills by state:',
  await q(
    `SELECT b.state, count(DISTINCT bs.bill_id)::int n FROM bill_subject bs JOIN bill b ON b.id = bs.bill_id
     WHERE bs.source = 'foreign-affairs' GROUP BY b.state ORDER BY b.state`,
  ),
);
console.log(
  'sponsorships by state (total / linked-to-legislator):',
  await q(
    `SELECT b.state, count(*)::int total, count(s.legislator_id)::int linked
     FROM sponsorship s JOIN bill b ON b.id = s.bill_id GROUP BY b.state ORDER BY b.state`,
  ),
);
const orphan = await q(
  `SELECT count(*)::int n FROM sponsorship s
   WHERE s.legislator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM legislator l WHERE l.id = s.legislator_id)`,
);
console.log('orphan sponsorship legislator_id (MUST be 0):', orphan[0].n);

console.log('committees by state:', await q(`SELECT state, count(*)::int n FROM committee GROUP BY state ORDER BY state`));
console.log(
  'committee memberships by state (total / linked):',
  await q(
    `SELECT c.state, count(*)::int total, count(cm.legislator_id)::int linked
     FROM committee_membership cm JOIN committee c ON c.id = cm.committee_id GROUP BY c.state ORDER BY c.state`,
  ),
);
const orphanCm = await q(
  `SELECT count(*)::int n FROM committee_membership cm
   WHERE cm.legislator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM legislator l WHERE l.id = cm.legislator_id)`,
);
console.log('orphan committee_membership legislator_id (MUST be 0):', orphanCm[0].n);

await c.end();
