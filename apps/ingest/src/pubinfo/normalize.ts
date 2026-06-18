import type pg from 'pg';

// Chamber derivation from a PUBINFO location: committee codes are CS## (Senate) /
// CX## (Assembly), floor codes are SFLOOR / AFLOOR, and free-text descriptions are
// prefixed "Sen " / "Asm ".
const CHAMBER_FROM_LOC = (codeCol: string, descCol: string) => `
  (CASE
     WHEN ${codeCol} LIKE 'CS%' OR ${codeCol} = 'SFLOOR' OR ${descCol} LIKE 'Sen %' THEN 'senate'
     WHEN ${codeCol} LIKE 'CX%' OR ${codeCol} = 'AFLOOR' OR ${descCol} LIKE 'Asm %' THEN 'assembly'
   END)::chamber`;

// A stable synthetic id shared by a vote event (summary) and its records (detail).
const VOTE_KEY = (a: string) =>
  `${a}.bill_id || ':' || ${a}.location_code || ':' || ${a}.vote_date_time || ':' || ${a}.vote_date_seq || ':' || coalesce(${a}.motion_id,'')`;

// The session_year of the archive currently staged in raw.* (e.g. "20212022").
// Multi-session: normalize only DELETEs+reinserts THIS session's rows, so loading
// 2021-2022 never wipes the already-loaded 2025-2026 data, and vice-versa.
export function normalizeSteps(sessionYear: string): { label: string; sql: string }[] {
  if (!/^\d{8}$/.test(sessionYear)) throw new Error(`bad session_year: ${sessionYear}`);
  const sy = sessionYear;
  return [
  {
    label: 'dedupe location + motion lookups',
    sql: `
      DROP TABLE IF EXISTS tmp_loc;
      CREATE TEMP TABLE tmp_loc AS
        SELECT DISTINCT ON (location_code) location_code, location_type, description, long_description
        FROM raw.location_code_tbl ORDER BY location_code, session_year DESC;
      DROP TABLE IF EXISTS tmp_motion;
      CREATE TEMP TABLE tmp_motion AS
        SELECT DISTINCT ON (motion_id) motion_id, motion_text FROM raw.bill_motion_tbl ORDER BY motion_id;`,
  },
  {
    // Session-scoped wipe: deleting this session's bills/legislators cascades to
    // their actions/sponsorships/votes/hearings/memberships, leaving other sessions
    // (and the shared committee table) intact.
    label: `wipe session ${sy}`,
    sql: `DELETE FROM bill WHERE session_year = '${sy}';
          DELETE FROM legislator WHERE session_year = '${sy}';`,
  },
  {
    label: 'committees (from committee location codes)',
    // Location codes recur across sessions — upsert so a second session doesn't
    // collide on the shared, session-agnostic committee table.
    sql: `
      INSERT INTO committee (id, name, chamber, type, location_code, source)
      SELECT location_code, long_description,
             ${CHAMBER_FROM_LOC('location_code', 'description')}, 'standing', location_code, 'pubinfo'
      FROM tmp_loc WHERE location_type = 'B'
      ON CONFLICT (id) DO NOTHING;`,
  },
  {
    label: 'legislators (current roster)',
    sql: `
      INSERT INTO legislator (id, session_year, chamber, district, full_name, first_name, last_name,
                              pubinfo_name, party, active, source)
      SELECT DISTINCT ON (house_type, (substring(district from 3))::int)
             session_year || ':' || (CASE house_type WHEN 'A' THEN 'assembly' ELSE 'senate' END)
               || ':' || (substring(district from 3))::int,
             session_year,
             (CASE house_type WHEN 'A' THEN 'assembly' ELSE 'senate' END)::chamber,
             (substring(district from 3))::int,
             COALESCE(NULLIF(btrim(concat_ws(' ', first_name, last_name)), ''), legislator_name, '(Vacant)'),
             first_name, last_name, legislator_name,
             (CASE party WHEN 'DEM' THEN 'Democratic' WHEN 'REP' THEN 'Republican' ELSE party END),
             true, 'pubinfo'
      FROM raw.legislator_tbl
      WHERE active_legislator = 'Y' AND district ~ '^[AS]D[0-9]+$'
      ORDER BY house_type, (substring(district from 3))::int, active_flg DESC;`,
  },
  {
    // `active` = member of the CURRENT (latest-loaded) session. Recomputed each run
    // so historical-session members are inactive and read paths (legislator list,
    // enrichment, committee matching, district relink) keep targeting the current roster.
    label: 'mark current-session members active',
    sql: `UPDATE legislator SET active = (session_year = (SELECT max(session_year) FROM legislator));`,
  },
  {
    // Deterministic CA cycle: Assembly = every even year; Senate even-numbered
    // districts in gubernatorial years (2026, 2030…), odd in presidential (2028…).
    label: 'compute next election year',
    sql: `
      UPDATE legislator SET next_election_year = CASE
        WHEN chamber = 'assembly' THEN right(session_year, 4)::int
        WHEN chamber = 'senate' AND district % 2 = 0 THEN right(session_year, 4)::int
        ELSE right(session_year, 4)::int + 2
      END;`,
  },
  {
    label: 'name lookup (unique last name OR full name per chamber)',
    // Roll-call/author records normally carry just a last name, but when two
    // members share a surname (e.g. two "Rodriguez") CA records the FULL name
    // ("Michelle Rodriguez"). Key on both forms, keeping only keys unique within
    // the chamber, so shared-surname members still attribute correctly.
    sql: `
      DROP TABLE IF EXISTS leg_match;
      CREATE TEMP TABLE leg_match AS
        SELECT chamber, key, legislator_id FROM (
          SELECT chamber, lower(last_name) AS key, min(id) AS legislator_id, count(*) AS n
          FROM legislator WHERE last_name IS NOT NULL AND session_year = '${sy}'
          GROUP BY chamber, lower(last_name)
          UNION ALL
          SELECT chamber,
                 lower(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) AS key,
                 min(id), count(*)
          FROM legislator WHERE first_name IS NOT NULL AND last_name IS NOT NULL AND session_year = '${sy}'
          GROUP BY chamber, lower(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')))
        ) s
        WHERE n = 1;
      CREATE INDEX leg_match_idx ON leg_match (chamber, key);`,
  },
  {
    label: 'bills',
    sql: `
      INSERT INTO bill (id, session_year, session, measure_type, measure_num, identifier, chamber_of_origin,
                        title, summary, status, status_code, current_location, current_location_code,
                        current_house, latest_version_id, urgency, appropriation, fiscal_committee, source)
      SELECT b.bill_id, b.session_year,
             substring(b.session_year,1,4) || '-' || substring(b.session_year,5,4),
             b.measure_type, b.measure_num::int, b.measure_type || ' ' || b.measure_num,
             (CASE WHEN left(b.measure_type,1) = 'S' THEN 'senate' ELSE 'assembly' END)::chamber,
             v.subject, v.subject, b.current_status, b.measure_state,
             loc.description, b.current_location, b.current_house, b.latest_bill_version_id,
             (v.urgency = 'Y'), (v.appropriation = 'Y'), (v.fiscal_committee = 'Y'), 'pubinfo'
      FROM raw.bill_tbl b
      LEFT JOIN raw.bill_version_tbl v ON v.bill_version_id = b.latest_bill_version_id
      LEFT JOIN tmp_loc loc ON loc.location_code = b.current_location;`,
  },
  {
    label: 'bill intro / latest action',
    sql: `
      UPDATE bill SET last_action_date = h.max_date,
                      last_action_description = h.last_action,
                      introduced_date = h.min_date::date
      FROM (SELECT bill_id,
                   max(action_date::timestamp) AS max_date,
                   min(action_date::timestamp) AS min_date,
                   (array_agg(action ORDER BY action_sequence::int DESC NULLS LAST))[1] AS last_action
            FROM raw.bill_history_tbl GROUP BY bill_id) h
      WHERE bill.id = h.bill_id;`,
  },
  {
    label: 'bill actions (history timeline)',
    sql: `
      INSERT INTO bill_action (id, bill_id, action_date, description, action_sequence, action_code,
                              primary_location, chamber, source)
      SELECT h.bill_history_id, h.bill_id, h.action_date::timestamp, h.action,
             NULLIF(h.action_sequence,'')::int, h.action_code, h.primary_location,
             ${CHAMBER_FROM_LOC('h.primary_location', 'loc.description')}, 'pubinfo'
      FROM raw.bill_history_tbl h
      JOIN bill b ON b.id = h.bill_id
      LEFT JOIN tmp_loc loc ON loc.location_code = h.primary_location
      ON CONFLICT (id) DO NOTHING;`,
  },
  {
    label: 'sponsorships (authors of latest version)',
    sql: `
      INSERT INTO sponsorship (bill_id, legislator_id, legislator_name, type, house, source)
      SELECT b.id, lbn.legislator_id, a.name,
             (CASE WHEN a.primary_author_flg = 'Y' THEN 'primary' ELSE 'co' END)::sponsor_type,
             a.house, 'pubinfo'
      FROM bill b
      JOIN raw.bill_version_authors_tbl a ON a.bill_version_id = b.latest_version_id
      LEFT JOIN leg_match lbn
        ON lbn.chamber = (CASE a.house WHEN 'SENATE' THEN 'senate' WHEN 'ASSEMBLY' THEN 'assembly' END)::chamber
       AND lbn.key = lower(btrim(a.name))
      WHERE a.type = 'Legislator' AND a.name IS NOT NULL
      ON CONFLICT (bill_id, legislator_name, type) DO NOTHING;`,
  },
  {
    label: 'vote events (summary)',
    sql: `
      INSERT INTO vote_event (id, bill_id, date, chamber, location_code, location_name, committee_id,
                              is_floor, motion_id, motion, result, ayes, noes, abstain, source)
      SELECT ${VOTE_KEY('s')}, s.bill_id, s.vote_date_time::timestamp,
             ${CHAMBER_FROM_LOC('s.location_code', 'loc.description')},
             s.location_code, loc.description,
             (CASE WHEN loc.location_type = 'B' THEN s.location_code END),
             (s.location_code IN ('AFLOOR','SFLOOR')),
             s.motion_id, m.motion_text, s.vote_result,
             NULLIF(s.ayes,'')::int, NULLIF(s.noes,'')::int, NULLIF(s.abstain,'')::int, 'pubinfo'
      FROM raw.bill_summary_vote_tbl s
      JOIN bill b ON b.id = s.bill_id
      LEFT JOIN tmp_loc loc ON loc.location_code = s.location_code
      LEFT JOIN tmp_motion m ON m.motion_id = s.motion_id
      ON CONFLICT (id) DO NOTHING;`,
  },
  {
    label: 'vote records (detail)',
    sql: `
      INSERT INTO vote_record (vote_event_id, legislator_id, legislator_name, option, member_order)
      SELECT ${VOTE_KEY('d')}, lbn.legislator_id, d.legislator_name,
             (CASE d.vote_code WHEN 'AYE' THEN 'yea' WHEN 'NOE' THEN 'nay'
                               WHEN 'ABS' THEN 'abstain' ELSE 'other' END)::vote_option,
             NULLIF(d.member_order,'')::int
      FROM raw.bill_detail_vote_tbl d
      JOIN vote_event ve ON ve.id = ${VOTE_KEY('d')}
      LEFT JOIN leg_match lbn ON lbn.chamber = ve.chamber AND lbn.key = lower(btrim(d.legislator_name))
      ON CONFLICT (vote_event_id, legislator_name) DO NOTHING;`,

  },
  {
    label: 'committee hearings',
    sql: `
      INSERT INTO committee_hearing (id, bill_id, committee_id, location_code, committee_type,
                                    committee_nr, hearing_date, source)
      SELECT ch.bill_id || ':' || ch.location_code || ':' || ch.hearing_date, ch.bill_id,
             (CASE WHEN loc.location_type = 'B' THEN ch.location_code END),
             ch.location_code, ch.committee_type, ch.committee_nr, ch.hearing_date::timestamp, 'pubinfo'
      FROM raw.committee_hearing_tbl ch
      JOIN bill b ON b.id = ch.bill_id
      LEFT JOIN tmp_loc loc ON loc.location_code = ch.location_code
      ON CONFLICT (id) DO NOTHING;`,
  },
  {
    // Districts (geometry loaded by the separate `districts` ingest) survive this
    // refresh, so re-point them at the freshly-rebuilt current legislators.
    label: 'relink districts to current legislators',
    sql: `
      UPDATE district d SET current_legislator_id = l.id
      FROM legislator l
      WHERE l.chamber = d.chamber AND l.district = d.number AND l.active = true;`,
  },
  ];
}

const COUNT_TABLES = [
  'legislator', 'committee', 'bill', 'bill_action', 'sponsorship',
  'vote_event', 'vote_record', 'committee_hearing',
];

export async function normalize(client: pg.Client): Promise<Record<string, number>> {
  // Which session is staged in raw.*? Drives the session-scoped wipe + name match.
  const { rows: syRows } = await client.query<{ sy: string }>(
    `SELECT max(session_year) AS sy FROM raw.bill_tbl`,
  );
  const sessionYear = syRows[0]?.sy;
  if (!sessionYear) throw new Error('normalize: no session_year in raw.bill_tbl (staging empty?)');
  console.log(`  • normalizing session ${sessionYear}`);

  await client.query('BEGIN');
  try {
    for (const step of normalizeSteps(sessionYear)) {
      await client.query(step.sql);
      console.log(`  ✓ ${step.label}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  const counts: Record<string, number> = {};
  for (const t of COUNT_TABLES) {
    const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
    counts[t] = rows[0]!.n;
  }
  return counts;
}
