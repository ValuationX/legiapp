import { LegislatorQuery } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

const SUMMARY_COLS = `
  l.id, l.full_name AS "fullName", l.first_name AS "firstName", l.last_name AS "lastName",
  l.party, l.chamber, l.district, l.photo_url AS "photoUrl", l.next_election_year AS "nextElectionYear",
  l.active AS "inOffice", l.source, l.last_verified AS "lastVerified", l.conflict,
  COALESCE((SELECT json_agg(json_build_object('role', lr.role, 'chamber', lr.chamber) ORDER BY lr.role)
            FROM leadership_role lr WHERE lr.legislator_id = l.id), '[]') AS "leadershipRoles"`;

export async function legislatorRoutes(app: FastifyInstance) {
  app.get('/api/legislators', async (req) => {
    const q = LegislatorQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, val: unknown) => {
      params.push(val);
      where.push(clause.replace('?', `$${params.length}`));
    };
    add('l.state = ?', (q.state ?? 'CA').toUpperCase());
    // Default to the current roster; "all" shows every session, or pin one session_year.
    if (q.session === 'all') {
      /* no session filter */
    } else if (q.session) {
      add('l.session_year = ?', q.session);
    } else {
      where.push('l.active = true');
    }
    if (q.chamber) add('l.chamber = ?', q.chamber);
    // Prefix match so fusion-party states (e.g. NY "Democratic/Working Families")
    // still match the "Democratic"/"Republican" filter; exact for CA.
    if (q.party) add('l.party ILIKE ?', `${q.party}%`);
    if (q.district) add('l.district = ?', q.district);
    if (q.reelectionYear) add('l.next_election_year = ?', q.reelectionYear);
    if (q.q) add('l.full_name ILIKE ?', `%${q.q}%`);
    if (q.positionTopic) {
      params.push(q.positionTopic);
      const ti = params.length;
      if (q.positionStance) {
        params.push(q.positionStance);
        where.push(
          `EXISTS (SELECT 1 FROM member_position mp WHERE mp.legislator_id = l.id AND mp.topic = $${ti} AND mp.stance = $${params.length}::stance)`,
        );
      } else {
        where.push(`EXISTS (SELECT 1 FROM member_position mp WHERE mp.legislator_id = l.id AND mp.topic = $${ti})`);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM legislator l ${whereSql}`,
      params,
    );
    const count = countRows[0]?.count ?? 0;
    params.push(q.pageSize, (q.page - 1) * q.pageSize);
    const items = await query(
      `SELECT ${SUMMARY_COLS} FROM legislator l ${whereSql}
       ORDER BY l.chamber, l.district
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items, total: count, page: q.page, pageSize: q.pageSize };
  });

  app.get('/api/legislators/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query(
      `SELECT ${SUMMARY_COLS}, l.email, l.phone, l.office, l.website, l.seniority,
              l.term_start::text AS "termStart", l.term_end::text AS "termEnd",
              COALESCE((SELECT json_agg(json_build_object('committeeId', c.id, 'committeeName', c.name, 'role', cm.role)
                                        ORDER BY cm.role)
                        FROM committee_membership cm JOIN committee c ON c.id = cm.committee_id
                        WHERE cm.legislator_id = l.id), '[]') AS committees,
              COALESCE((SELECT json_agg(json_build_object('topic', mp.topic, 'stance', mp.stance, 'note', mp.note,
                                                          'billId', mp.bill_id, 'billIdentifier', b.identifier,
                                                          'sourceUrl', mp.source_url) ORDER BY mp.topic)
                        FROM member_position mp LEFT JOIN bill b ON b.id = mp.bill_id
                        WHERE mp.legislator_id = l.id), '[]') AS positions,
              (SELECT count(*)::int FROM sponsorship s WHERE s.legislator_id = l.id) AS "sponsoredCount"
       FROM legislator l WHERE l.id = $1`,
      [id],
    );
    if (!rows.length) return reply.code(404).send({ error: 'Legislator not found' });
    return rows[0];
  });

  app.get('/api/legislators/:id/votes', async (req) => {
    const { id } = req.params as { id: string };
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 60), 250);
    return query(
      `SELECT vr.vote_event_id AS "voteEventId", ve.bill_id AS "billId", b.identifier AS "billIdentifier",
              b.title AS "billTitle", ve.date, vr.option, ve.result, ve.motion, ve.is_floor AS "isFloor"
       FROM vote_record vr
       JOIN vote_event ve ON ve.id = vr.vote_event_id
       JOIN bill b ON b.id = ve.bill_id
       WHERE vr.legislator_id = $1
       ORDER BY ve.date DESC NULLS LAST
       LIMIT $2`,
      [id, limit],
    );
  });

  app.get('/api/legislators/:id/bills', async (req) => {
    const { id } = req.params as { id: string };
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 100), 300);
    return query(
      `SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
              b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
              b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
              b.source, b.last_verified AS "lastVerified", b.conflict,
              CASE WHEN bool_or(s.type = 'primary') THEN 'primary' ELSE 'co' END AS "sponsorType",
              COALESCE((SELECT array_agg(bs.subject ORDER BY bs.subject) FROM bill_subject bs
                        WHERE bs.bill_id = b.id AND bs.source = 'foreign-affairs'), ARRAY[]::text[]) AS "faRegions"
       FROM sponsorship s JOIN bill b ON b.id = s.bill_id
       WHERE s.legislator_id = $1
       GROUP BY b.id
       ORDER BY max(b.last_action_date) DESC NULLS LAST
       LIMIT $2`,
      [id, limit],
    );
  });
}
