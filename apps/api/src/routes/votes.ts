import type { FastifyInstance } from 'fastify';
import { currentLegislatorLateral, query } from '../db.js';

export async function voteRoutes(app: FastifyInstance) {
  app.get('/api/votes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query(
      `SELECT ve.id, ve.bill_id AS "billId", b.identifier AS "billIdentifier", b.title AS "billTitle",
              ve.date, ve.chamber, ve.location_name AS "locationName", ve.committee_id AS "committeeId",
              ve.is_floor AS "isFloor", ve.motion, ve.result, ve.ayes, ve.noes, ve.abstain,
              COALESCE((SELECT json_agg(json_build_object('legislatorId', COALESCE(curlnk.id, vr.legislator_id),
                                                          'legislatorName', vr.legislator_name,
                                                          'party', l.party, 'option', vr.option)
                                        ORDER BY vr.option, vr.legislator_name)
                        FROM vote_record vr LEFT JOIN legislator l ON l.id = vr.legislator_id
                        ${currentLegislatorLateral()}
                        WHERE vr.vote_event_id = ve.id), '[]') AS records
       FROM vote_event ve JOIN bill b ON b.id = ve.bill_id
       WHERE ve.id = $1`,
      [id],
    );
    if (!rows.length) return reply.code(404).send({ error: 'Vote not found' });
    return rows[0];
  });
}
