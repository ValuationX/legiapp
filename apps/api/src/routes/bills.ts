import { BILL_STATUS_BUCKETS, BillQuery, billStatusBucket } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { currentLegislatorLateral, query } from '../db.js';
import { stateOf } from '../state.js';

const SUMMARY_COLS = `
  b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
  b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
  b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
  b.source, b.last_verified AS "lastVerified", b.conflict`;

export async function billRoutes(app: FastifyInstance) {
  app.get('/api/bills', async (req) => {
    const q = BillQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, val: unknown) => {
      params.push(val);
      where.push(clause.replace('?', `$${params.length}`));
    };
    // State scope (default CA). A validated registry code — safe to inline in subqueries.
    const stateLit = stateOf(req);
    add('b.state = ?', stateLit);
    // Default to the current session; "all" spans every session, or pin one session_year.
    if (q.session === 'all') {
      /* no session filter */
    } else if (q.session) {
      add('b.session_year = ?', q.session);
    } else {
      where.push(`b.session_year = (SELECT max(session_year) FROM bill WHERE state = '${stateLit}')`);
    }
    // "Active" (the default): bills that moved within ~30 days of the latest legislative
    // activity (data-relative, so it's robust to snapshot age) and aren't dead/vetoed —
    // i.e. the measures being worked on right now.
    if (q.active) {
      where.push(
        `b.last_action_date >= (SELECT max(last_action_date) - interval '30 days' FROM bill WHERE state = '${stateLit}' AND session_year = (SELECT max(session_year) FROM bill WHERE state = '${stateLit}'))
         AND coalesce(b.status, '') !~* 'died|vetoed'`,
      );
    }
    if (q.chamber) add('b.chamber_of_origin = ?', q.chamber);
    if (q.measureType) add('b.measure_type = ?', q.measureType);
    if (q.status) add('b.status = ?', q.status);
    // Friendly status bucket → expand to the raw status strings that map to it for
    // this state (so pagination totals stay correct). 'other' also covers null status.
    if (q.canonicalStatus) {
      const rows = await query<{ value: string }>(
        `SELECT DISTINCT status AS value FROM bill WHERE status IS NOT NULL AND state = '${stateLit}'`,
      );
      const raws = rows.map((r) => r.value).filter((v) => billStatusBucket(v) === q.canonicalStatus);
      const includeNull = q.canonicalStatus === 'other';
      if (raws.length && includeNull) {
        params.push(raws);
        where.push(`(b.status IS NULL OR b.status = ANY($${params.length}))`);
      } else if (raws.length) {
        add('b.status = ANY(?)', raws);
      } else if (includeNull) {
        where.push('b.status IS NULL');
      } else {
        where.push('false'); // bucket has no matching raw statuses in this state
      }
    }
    if (q.sponsor) add('EXISTS (SELECT 1 FROM sponsorship s WHERE s.bill_id = b.id AND s.legislator_id = ?)', q.sponsor);
    if (q.subject) add('EXISTS (SELECT 1 FROM bill_subject bs WHERE bs.bill_id = b.id AND bs.subject = ?)', q.subject);

    // Full-text search across identifier + title + digest + full body text. Parse the
    // query string once into a CTE (`tsq`) and reuse it in WHERE / ts_headline / ts_rank
    // instead of calling websearch_to_tsquery three times per request.
    let tsIdx = 0;
    if (q.q) {
      params.push(q.q);
      tsIdx = params.length;
      where.push(`b.search_tsv @@ tsq.q`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const tsCte = tsIdx ? `WITH tsq AS (SELECT websearch_to_tsquery('english', $${tsIdx}) AS q) ` : '';
    const tsFrom = tsIdx ? ' CROSS JOIN tsq' : '';

    const countRows = await query<{ count: number }>(
      `${tsCte}SELECT count(*)::int AS count FROM bill b${tsFrom} ${whereSql}`,
      params,
    );
    const count = countRows[0]?.count ?? 0;

    const snippet = tsIdx
      ? `, ts_headline('english', coalesce(b.digest, b.title, b.full_text, ''),
           tsq.q,
           'StartSel=«,StopSel=»,MaxFragments=1,MaxWords=30,MinWords=12,ShortWord=2') AS "matchSnippet"`
      : '';
    const order = tsIdx
      ? `ts_rank(b.search_tsv, tsq.q) DESC, b.last_action_date DESC NULLS LAST`
      : 'b.last_action_date DESC NULLS LAST';

    params.push(q.pageSize, (q.page - 1) * q.pageSize);
    const items = await query(
      `${tsCte}SELECT ${SUMMARY_COLS}${snippet} FROM bill b${tsFrom} ${whereSql}
       ORDER BY ${order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items, total: count, page: q.page, pageSize: q.pageSize };
  });

  app.get('/api/bills/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query(
      `SELECT ${SUMMARY_COLS}, b.summary, b.session, b.introduced_date::text AS "introducedDate",
              COALESCE((SELECT json_agg(s.subject) FROM bill_subject s WHERE s.bill_id = b.id), '[]') AS subjects,
              COALESCE((SELECT json_agg(json_build_object('id', a.id, 'date', a.action_date,
                                                          'description', a.description, 'chamber', a.chamber)
                                        ORDER BY a.action_sequence DESC NULLS LAST)
                        FROM bill_action a WHERE a.bill_id = b.id), '[]') AS actions,
              COALESCE((SELECT json_agg(json_build_object('legislatorId', COALESCE(curlnk.id, sp.legislator_id), 'legislatorName', sp.legislator_name,
                                                          'type', sp.type, 'party', l.party, 'chamber', l.chamber)
                                        ORDER BY sp.type, sp.legislator_name)
                        FROM sponsorship sp LEFT JOIN legislator l ON l.id = sp.legislator_id
                        ${currentLegislatorLateral()}
                        WHERE sp.bill_id = b.id), '[]') AS sponsors,
              COALESCE((SELECT json_agg(json_build_object('id', ve.id, 'date', ve.date, 'chamber', ve.chamber,
                                                          'locationName', ve.location_name, 'committeeId', ve.committee_id,
                                                          'isFloor', ve.is_floor, 'motion', ve.motion, 'result', ve.result,
                                                          'ayes', ve.ayes, 'noes', ve.noes, 'abstain', ve.abstain)
                                        ORDER BY ve.date DESC NULLS LAST)
                        FROM vote_event ve WHERE ve.bill_id = b.id), '[]') AS votes
       FROM bill b WHERE b.id = $1`,
      [id],
    );
    if (!rows.length) return reply.code(404).send({ error: 'Bill not found' });
    return rows[0];
  });

  // Filter facets (distinct statuses / measure types / subjects) for the bills list UI.
  app.get('/api/bills-facets', async (req) => {
    const stateLit = stateOf(req);
    const statuses = await query<{ value: string }>(
      `SELECT DISTINCT status AS value FROM bill WHERE status IS NOT NULL AND state = '${stateLit}' ORDER BY 1`,
    );
    const measureTypes = await query<{ value: string }>(
      `SELECT DISTINCT measure_type AS value FROM bill WHERE state = '${stateLit}' ORDER BY 1`,
    );
    const subjects = await query<{ value: string }>(
      // Exclude the foreign-affairs region keys (lowercase tracker tags) from the
      // human-facing subject facet — the "Foreign Affairs" umbrella covers them here.
      `SELECT bs.subject AS value FROM bill_subject bs JOIN bill b ON b.id = bs.bill_id
       WHERE bs.source <> 'foreign-affairs' AND b.state = '${stateLit}'
       GROUP BY bs.subject ORDER BY count(*) DESC, bs.subject LIMIT 80`,
    );
    // Canonical buckets present in this state, in canonical order (drives the friendly
    // status dropdown instead of the raw distinct strings).
    const present = new Set(statuses.map((r) => billStatusBucket(r.value)));
    const statusBuckets = BILL_STATUS_BUCKETS.filter((b) => present.has(b));
    return {
      statuses: statuses.map((r) => r.value),
      statusBuckets,
      measureTypes: measureTypes.map((r) => r.value),
      subjects: subjects.map((r) => r.value),
    };
  });
}
