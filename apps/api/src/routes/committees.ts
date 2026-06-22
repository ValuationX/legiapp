import { CommitteeQuery } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { stateOf } from '../state.js';

export async function committeeRoutes(app: FastifyInstance) {
  app.get('/api/committees', async (req) => {
    const q = CommitteeQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, val: unknown) => {
      params.push(val);
      where.push(clause.replace('?', `$${params.length}`));
    };
    add('c.state = ?', stateOf(req));
    if (q.chamber) add('c.chamber = ?', q.chamber);
    if (q.q) add('c.name ILIKE ?', `%${q.q}%`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return query(
      `SELECT c.id, c.name, c.chamber, c.type, c.source, c.last_verified AS "lastVerified", c.conflict,
              (SELECT count(*)::int FROM committee_membership cm WHERE cm.committee_id = c.id) AS "memberCount"
       FROM committee c ${whereSql}
       ORDER BY c.chamber, c.name`,
      params,
    );
  });

  app.get('/api/committees/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query(
      `SELECT c.id, c.name, c.chamber, c.type, c.source, c.last_verified AS "lastVerified", c.conflict,
              (SELECT count(*)::int FROM committee_membership cm WHERE cm.committee_id = c.id) AS "memberCount",
              COALESCE((SELECT json_agg(json_build_object('legislatorId', l.id, 'fullName', l.full_name,
                                                          'party', l.party, 'chamber', l.chamber,
                                                          'district', l.district, 'role', cm.role)
                                        ORDER BY cm.role, l.full_name)
                        FROM committee_membership cm JOIN legislator l ON l.id = cm.legislator_id
                        WHERE cm.committee_id = c.id), '[]') AS members,
              COALESCE((SELECT json_agg(h ORDER BY h.date DESC)
                        FROM (SELECT DISTINCT ON (ch.bill_id) ch.bill_id AS "billId", b.identifier AS "billIdentifier",
                                     ch.hearing_date AS date
                              FROM committee_hearing ch JOIN bill b ON b.id = ch.bill_id
                              WHERE ch.committee_id = c.id
                              ORDER BY ch.bill_id, ch.hearing_date DESC) h), '[]') AS "recentHearings"
       FROM committee c WHERE c.id = $1`,
      [id],
    );
    if (!rows.length) return reply.code(404).send({ error: 'Committee not found' });
    return rows[0];
  });

  // Bills currently located in this committee (referred / in process).
  app.get('/api/committees/:id/bills', async (req) => {
    const { id } = req.params as { id: string };
    return query(
      `SELECT b.id, b.identifier, b.measure_type AS "measureType", b.measure_num AS "measureNum",
              b.title, b.status, b.chamber_of_origin AS "chamberOfOrigin", b.current_location AS "currentLocation",
              b.last_action_date AS "lastActionDate", b.last_action_description AS "lastActionDescription",
              b.source, b.last_verified AS "lastVerified", b.conflict
       FROM bill b WHERE b.current_location_code = $1
       ORDER BY b.last_action_date DESC NULLS LAST LIMIT 200`,
      [id],
    );
  });
}
