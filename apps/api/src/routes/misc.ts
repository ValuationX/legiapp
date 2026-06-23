import { timingSafeEqual } from 'node:crypto';
import { SearchQuery } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { stateOf } from '../state.js';

export async function miscRoutes(app: FastifyInstance) {
  // Global search across members, bills, committees.
  app.get('/api/search', async (req) => {
    const { q, limit } = SearchQuery.parse(req.query);
    const like = `%${q}%`;
    const state = stateOf(req);
    const [legislators, bills, committees] = await Promise.all([
      query(
        `SELECT l.id, l.full_name AS "fullName", l.first_name AS "firstName", l.last_name AS "lastName",
                l.party, l.chamber, l.district, l.photo_url AS "photoUrl", l.source,
                l.last_verified AS "lastVerified", l.conflict, '[]'::json AS "leadershipRoles"
         FROM legislator l WHERE l.full_name ILIKE $1 AND l.state = $3 ORDER BY l.full_name LIMIT $2`,
        [like, limit, state],
      ),
      query(
        `WITH tsq AS (SELECT websearch_to_tsquery('english', $1) AS q)
         SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
                b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
                b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
                b.source, b.last_verified AS "lastVerified", b.conflict,
                ts_headline('english', coalesce(b.digest, b.title, b.full_text, ''),
                  tsq.q,
                  'StartSel=«,StopSel=»,MaxFragments=1,MaxWords=24,MinWords=8') AS "matchSnippet"
         FROM bill b CROSS JOIN tsq
         WHERE b.state = $4 AND (b.search_tsv @@ tsq.q OR b.identifier ILIKE $2)
         ORDER BY (b.identifier ILIKE $2) DESC,
                  ts_rank(b.search_tsv, tsq.q) DESC,
                  b.last_action_date DESC NULLS LAST
         LIMIT $3`,
        [q, like, limit, state],
      ),
      query(
        `SELECT c.id, c.name, c.chamber, c.type, c.source, c.last_verified AS "lastVerified", c.conflict,
                (SELECT count(*)::int FROM committee_membership cm WHERE cm.committee_id = c.id) AS "memberCount"
         FROM committee c WHERE c.name ILIKE $1 AND c.state = $3 ORDER BY c.name LIMIT $2`,
        [like, limit, state],
      ),
    ]);
    return { legislators, bills, committees };
  });

  // "This week" dashboard: recently moved bills + upcoming hearings + freshness.
  app.get('/api/dashboard/this-week', async (req) => {
    const stateLit = stateOf(req);
    // The five panels are independent, so run them as one parallel batch instead of five
    // serial round-trips — this is the landing page's main payload.
    const [recentlyMovedBills, upcomingHearings, upcomingDeadlines, dataFreshness, countRows] = await Promise.all([
      query(
        `SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
                b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
                b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
                b.source, b.last_verified AS "lastVerified", b.conflict
         FROM bill b
         WHERE b.state = '${stateLit}'
           AND b.session_year = (SELECT max(session_year) FROM bill WHERE state = '${stateLit}')
           AND b.last_action_date >= (
             SELECT max(last_action_date) - interval '14 days' FROM bill WHERE state = '${stateLit}' AND session_year = (SELECT max(session_year) FROM bill WHERE state = '${stateLit}'))
         ORDER BY b.last_action_date DESC NULLS LAST
         LIMIT 25`,
      ),
      query(
        `SELECT ch.id, ch.hearing_date AS date, ch.committee_id AS "committeeId", c.name AS "committeeName",
                ch.bill_id AS "billId", b.identifier AS "billIdentifier", b.title AS "billTitle"
         FROM committee_hearing ch
         LEFT JOIN committee c ON c.id = ch.committee_id
         JOIN bill b ON b.id = ch.bill_id
         WHERE b.state = '${stateLit}' AND ch.hearing_date >= date_trunc('day', now())
         ORDER BY ch.hearing_date ASC
         LIMIT 30`,
      ),
      // Nearest legislative deadlines + election milestones (the influence windows).
      query(
        `SELECT id, date, type, title, detail,
                deadline_flag AS "deadlineFlag", source_url AS "sourceUrl",
                committee_id AS "committeeId", source, last_verified AS "lastVerified", conflict
         FROM calendar_event
         WHERE state = '${stateLit}' AND date >= date_trunc('day', now()) AND (deadline_flag = true OR type = 'election')
         ORDER BY date ASC
         LIMIT 8`,
      ),
      query(
        `SELECT (SELECT source FROM bill WHERE state = '${stateLit}' GROUP BY source ORDER BY count(*) DESC LIMIT 1) AS source,
                (SELECT max(last_verified) FROM bill WHERE state = '${stateLit}') AS "lastVerified",
                (SELECT count(*)::int FROM bill WHERE state = '${stateLit}' AND session_year = (SELECT max(session_year) FROM bill WHERE state = '${stateLit}')) AS records`,
      ),
      // Scalar counts the dashboard used to fetch via two extra full-collection queries
      // (committees('') + legislators('pageSize=1')); folded in here so the page makes one request.
      query<{ committees: number; legislators: number }>(
        `SELECT (SELECT count(*)::int FROM committee WHERE state = '${stateLit}') AS committees,
                (SELECT count(*)::int FROM legislator WHERE state = '${stateLit}' AND active = true) AS legislators`,
      ),
    ]);
    const counts = countRows[0] ?? { committees: 0, legislators: 0 };
    return { recentlyMovedBills, upcomingHearings, upcomingDeadlines, dataFreshness, counts };
  });

  // Source / freshness transparency.
  app.get('/api/meta/sources', async () => {
    return query(
      `SELECT source, kind, status, finished_at AS "lastVerified", stats
       FROM ingest_run ORDER BY started_at DESC LIMIT 10`,
    );
  });

  // Manual "refresh now" — token-guarded (constant-time compare), fire-and-forget.
  app.post('/api/ingest/refresh', async (req, reply) => {
    const token = String(req.headers['x-ingest-token'] ?? '');
    const expected = process.env.INGEST_REFRESH_TOKEN ?? '';
    const ok =
      expected.length > 0 &&
      token.length === expected.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!ok) return reply.code(401).send({ error: 'unauthorized' });
    // Ingest can't run on serverless (long-running + ~950MB download); on Vercel the
    // data is published from a snapshot into Neon instead.
    if (process.env.VERCEL) {
      return reply
        .code(501)
        .send({ error: 'Ingest runs only on the self-hosted deployment; this site is published from a snapshot.' });
    }
    // Lazy + non-statically-analyzable import so the ETL (unzipper/cheerio/etc.) is
    // never bundled into the serverless function.
    const ingestModule = '@legiapp/ingest/run';
    void import(ingestModule)
      .then((m) => (m as { runAll: () => Promise<void> }).runAll())
      .catch((err) => app.log.error(err));
    return reply.code(202).send({ started: true });
  });
}
