import {
  FA_REGIONS,
  FA_REGION_BY_KEY,
  ForeignAffairsQuery,
  alignmentLevel,
  type FaLeader,
  type FaSponsor,
} from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

interface BillRow {
  id: string;
  identifier: string;
  measureType: string;
  session: string;
  title: string | null;
  status: string | null;
  chamberOfOrigin: string | null;
  introducedDate: string | null;
  lastActionDate: string | null;
  regions: string[];
  signed: boolean;
  digestSnippet: string | null;
  sponsors: FaSponsor[];
  ayes: number | null;
  noes: number | null;
}

export async function foreignAffairsRoutes(app: FastifyInstance) {
  // Ukraine / foreign-affairs bills across ALL sessions, with authors, coauthors
  // (each flagged in-office vs left), signed/chaptered status, and a leaderboard.
  app.get('/api/foreign-affairs', async (req) => {
    const { region, state } = ForeignAffairsQuery.parse(req.query);
    const stateLit = (state ?? 'CA').toUpperCase().match(/^[A-Z]{2}$/)?.[0] ?? 'CA';
    const regionKey = region && FA_REGION_BY_KEY.has(region) ? region : undefined;

    // Region chips — always the full set (with counts), ordered Ukraine-first.
    const counts = await query<{ key: string; count: number }>(
      `SELECT bs.subject AS key, count(*)::int AS count FROM bill_subject bs JOIN bill b ON b.id = bs.bill_id
       WHERE bs.source = 'foreign-affairs' AND b.state = '${stateLit}' GROUP BY bs.subject`,
    );
    const countMap = new Map(counts.map((c) => [c.key, c.count]));
    const regions = FA_REGIONS.map((r) => ({
      key: r.key,
      label: r.label,
      adjacent: r.adjacent,
      count: countMap.get(r.key) ?? 0,
    }));

    // Bills (optionally one region). Sponsors carry their in-office status; a
    // historical sponsor is "in office" if a same-surname member sits in the
    // current session (best-effort, handles chamber switches).
    const billParams: unknown[] = [];
    let regionFilter = '';
    if (regionKey) {
      billParams.push(regionKey);
      regionFilter = `AND bs.bill_id IN (SELECT bill_id FROM bill_subject WHERE source = 'foreign-affairs' AND subject = $${billParams.length})`;
    }
    const billRows = await query<BillRow>(
      `WITH fa AS (
         SELECT bs.bill_id, array_agg(bs.subject ORDER BY bs.subject) AS regions
         FROM bill_subject bs
         WHERE bs.source = 'foreign-affairs' ${regionFilter}
         GROUP BY bs.bill_id
       )
       SELECT b.id, b.identifier, b.measure_type AS "measureType", b.session,
              b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin",
              b.introduced_date::text AS "introducedDate", b.last_action_date AS "lastActionDate",
              fa.regions,
              EXISTS (SELECT 1 FROM bill_action a WHERE a.bill_id = b.id
                      AND a.description ~* 'chaptered|approved by the governor|signed by the governor') AS signed,
              left(coalesce(b.digest, b.summary, ''), 320) AS "digestSnippet",
              COALESCE((
                SELECT json_agg(json_build_object(
                         'legislatorId', sp.legislator_id, 'name', sp.legislator_name,
                         'party', l.party, 'chamber', l.chamber, 'type', sp.type,
                         'currentlyInOffice', EXISTS (
                            SELECT 1 FROM legislator cur WHERE cur.active = true
                            AND lower(cur.last_name) = lower(coalesce(l.last_name, split_part(sp.legislator_name, ' ', -1)))))
                       ORDER BY sp.type, sp.legislator_name)
                FROM sponsorship sp LEFT JOIN legislator l ON l.id = sp.legislator_id
                WHERE sp.bill_id = b.id), '[]') AS sponsors,
              (SELECT ve.ayes FROM vote_event ve WHERE ve.bill_id = b.id AND ve.is_floor ORDER BY ve.date DESC LIMIT 1) AS ayes,
              (SELECT ve.noes FROM vote_event ve WHERE ve.bill_id = b.id AND ve.is_floor ORDER BY ve.date DESC LIMIT 1) AS noes
       FROM fa JOIN bill b ON b.id = fa.bill_id
       WHERE b.state = '${stateLit}'
       ORDER BY b.last_action_date DESC NULLS LAST, b.introduced_date DESC NULLS LAST`,
      billParams,
    );
    const bills = billRows.map((b) => ({
      ...b,
      authors: b.sponsors.filter((s) => s.type === 'primary'),
      coauthors: b.sponsors.filter((s) => s.type === 'co'),
    }));

    // Leaderboard — aggregate a person across sessions by surname+chamber.
    const leaderParams: unknown[] = [];
    let leaderFilter = '';
    if (regionKey) {
      leaderParams.push(regionKey);
      leaderFilter = `AND subject = $${leaderParams.length}`;
    }
    const leaderRows = await query<Omit<FaLeader, 'level'>>(
      `SELECT *, (authored * 3 + coauthored + passed * 2) AS score FROM (
         SELECT (array_agg(l.id ORDER BY l.active DESC, l.session_year DESC))[1] AS "legislatorId",
                (array_agg(l.full_name ORDER BY l.active DESC, l.session_year DESC))[1] AS name,
                (array_agg(l.party ORDER BY l.active DESC, l.session_year DESC))[1] AS party,
                (array_agg(l.chamber::text ORDER BY l.active DESC, l.session_year DESC))[1] AS chamber,
                (array_agg(l.email ORDER BY l.active DESC, l.session_year DESC))[1] AS email,
                (array_agg(l.phone ORDER BY l.active DESC, l.session_year DESC))[1] AS phone,
                bool_or(l.active) AS "inOffice",
                count(*) FILTER (WHERE s.type = 'primary')::int AS authored,
                count(*) FILTER (WHERE s.type = 'co')::int AS coauthored,
                count(DISTINCT s.bill_id) FILTER (WHERE EXISTS (
                  SELECT 1 FROM bill_action a WHERE a.bill_id = s.bill_id
                  AND a.description ~* 'chaptered|approved by the governor'))::int AS passed,
                count(DISTINCT s.bill_id)::int AS total
         FROM sponsorship s JOIN legislator l ON l.id = s.legislator_id
         WHERE l.state = '${stateLit}' AND s.bill_id IN (SELECT bill_id FROM bill_subject WHERE source = 'foreign-affairs' ${leaderFilter})
         GROUP BY lower(l.last_name), l.chamber
       ) t
       ORDER BY score DESC, authored DESC, name
       LIMIT 40`,
      leaderParams,
    );
    const leaders: FaLeader[] = leaderRows.map((l) => ({ ...l, level: alignmentLevel(l.authored, l.score) }));

    return { regions, bills, leaders };
  });
}
