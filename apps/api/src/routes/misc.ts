import { timingSafeEqual } from 'node:crypto';
import { SearchQuery } from '@legiapp/shared';
import { runAll } from '@legiapp/ingest/run';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

export async function miscRoutes(app: FastifyInstance) {
  // Global search across members, bills, committees.
  app.get('/api/search', async (req) => {
    const { q, limit } = SearchQuery.parse(req.query);
    const like = `%${q}%`;
    const [legislators, bills, committees] = await Promise.all([
      query(
        `SELECT l.id, l.full_name AS "fullName", l.first_name AS "firstName", l.last_name AS "lastName",
                l.party, l.chamber, l.district, l.photo_url AS "photoUrl", l.source,
                l.last_verified AS "lastVerified", l.conflict, '[]'::json AS "leadershipRoles"
         FROM legislator l WHERE l.full_name ILIKE $1 ORDER BY l.full_name LIMIT $2`,
        [like, limit],
      ),
      query(
        `SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
                b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
                b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
                b.source, b.last_verified AS "lastVerified", b.conflict,
                ts_headline('english', coalesce(b.digest, b.title, b.full_text, ''),
                  websearch_to_tsquery('english', $1),
                  'StartSel=«,StopSel=»,MaxFragments=1,MaxWords=24,MinWords=8') AS "matchSnippet"
         FROM bill b
         WHERE b.search_tsv @@ websearch_to_tsquery('english', $1) OR b.identifier ILIKE $2
         ORDER BY (b.identifier ILIKE $2) DESC,
                  ts_rank(b.search_tsv, websearch_to_tsquery('english', $1)) DESC,
                  b.last_action_date DESC NULLS LAST
         LIMIT $3`,
        [q, like, limit],
      ),
      query(
        `SELECT c.id, c.name, c.chamber, c.type, c.source, c.last_verified AS "lastVerified", c.conflict,
                (SELECT count(*)::int FROM committee_membership cm WHERE cm.committee_id = c.id) AS "memberCount"
         FROM committee c WHERE c.name ILIKE $1 ORDER BY c.name LIMIT $2`,
        [like, limit],
      ),
    ]);
    return { legislators, bills, committees };
  });

  // "This week" dashboard: recently moved bills + upcoming hearings + freshness.
  app.get('/api/dashboard/this-week', async () => {
    const recentlyMovedBills = await query(
      `SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
              b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
              b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
              b.source, b.last_verified AS "lastVerified", b.conflict
       FROM bill b
       WHERE b.session_year = (SELECT max(session_year) FROM bill)
         AND b.last_action_date >= (
           SELECT max(last_action_date) - interval '14 days' FROM bill WHERE session_year = (SELECT max(session_year) FROM bill))
       ORDER BY b.last_action_date DESC NULLS LAST
       LIMIT 25`,
    );
    const upcomingHearings = await query(
      `SELECT ch.id, ch.hearing_date AS date, ch.committee_id AS "committeeId", c.name AS "committeeName",
              ch.bill_id AS "billId", b.identifier AS "billIdentifier", b.title AS "billTitle"
       FROM committee_hearing ch
       LEFT JOIN committee c ON c.id = ch.committee_id
       LEFT JOIN bill b ON b.id = ch.bill_id
       WHERE ch.hearing_date >= date_trunc('day', now())
       ORDER BY ch.hearing_date ASC
       LIMIT 30`,
    );
    // Nearest legislative deadlines + election milestones (the influence windows).
    const upcomingDeadlines = await query(
      `SELECT id, date, type, title, detail,
              deadline_flag AS "deadlineFlag", source_url AS "sourceUrl",
              committee_id AS "committeeId", source, last_verified AS "lastVerified", conflict
       FROM calendar_event
       WHERE date >= date_trunc('day', now()) AND (deadline_flag = true OR type = 'election')
       ORDER BY date ASC
       LIMIT 8`,
    );
    const dataFreshness = await query(
      `SELECT 'pubinfo' AS source,
              (SELECT max(last_verified) FROM bill) AS "lastVerified",
              (SELECT count(*)::int FROM bill WHERE session_year = (SELECT max(session_year) FROM bill)) AS records`,
    );
    return { recentlyMovedBills, upcomingHearings, upcomingDeadlines, dataFreshness };
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
    void runAll().catch((err) => app.log.error(err));
    return reply.code(202).send({ started: true });
  });
}
