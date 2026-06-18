// Dev utility: inspect real staging value vocabularies to design normalization.
// Run: npx tsx apps/ingest/src/pubinfo/inspect.ts
import { createPool } from '../db.js';

const pool = createPool();
async function q(label: string, sql: string) {
  const { rows } = await pool.query(sql);
  console.log(`\n### ${label}`);
  console.table(rows);
}

await q('legislator house_type', `SELECT house_type, count(*) FROM raw.legislator_tbl GROUP BY 1 ORDER BY 1`);
await q('legislator party', `SELECT party, count(*) FROM raw.legislator_tbl GROUP BY 1 ORDER BY 2 DESC`);
await q('legislator active flags', `SELECT active_flg, active_legislator, count(*) FROM raw.legislator_tbl GROUP BY 1,2 ORDER BY 3 DESC`);
await q('legislator samples', `SELECT district, legislator_name, house_type, party, active_legislator FROM raw.legislator_tbl WHERE active_legislator='Y' ORDER BY district LIMIT 8`);
await q('bill measure_type', `SELECT measure_type, count(*) FROM raw.bill_tbl GROUP BY 1 ORDER BY 2 DESC`);
await q('bill current_status top', `SELECT current_status, count(*) FROM raw.bill_tbl GROUP BY 1 ORDER BY 2 DESC LIMIT 12`);
await q('bill current_house', `SELECT current_house, count(*) FROM raw.bill_tbl GROUP BY 1`);
await q('detail vote_code', `SELECT vote_code, count(*) FROM raw.bill_detail_vote_tbl GROUP BY 1 ORDER BY 2 DESC`);
await q('summary vote_result', `SELECT vote_result, count(*) FROM raw.bill_summary_vote_tbl GROUP BY 1 ORDER BY 2 DESC LIMIT 12`);
await q('location_type', `SELECT location_type, count(*) FROM raw.location_code_tbl GROUP BY 1 ORDER BY 2 DESC`);
await q('location samples', `SELECT location_code, location_type, description, long_description FROM raw.location_code_tbl ORDER BY location_type, location_code LIMIT 30`);

await pool.end();
