import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { stateOf } from '../state.js';

export async function leadershipRoutes(app: FastifyInstance) {
  // Chamber leadership (Speaker, Pro Tem, floor leaders, whips, caucus chairs) with
  // each holder's foreign-affairs record — auto-reproduces the manual "Positions Guide".
  app.get('/api/leadership', async (req) => {
    const stateLit = stateOf(req);
    return query(
      `SELECT lr.role, l.chamber, l.id AS "legislatorId", l.full_name AS "fullName",
              l.party, l.district, l.district_label AS "districtLabel", l.photo_url AS "photoUrl", l.email, l.phone, l.website,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'id', b.id, 'identifier', b.identifier, 'type', s.type,
                         'regions', (SELECT array_agg(bs2.subject ORDER BY bs2.subject)
                                     FROM bill_subject bs2 WHERE bs2.bill_id = b.id AND bs2.source = 'foreign-affairs')
                       ) ORDER BY s.type, b.identifier)
                FROM sponsorship s JOIN bill b ON b.id = s.bill_id
                WHERE s.legislator_id = l.id
                  AND EXISTS (SELECT 1 FROM bill_subject bs WHERE bs.bill_id = b.id AND bs.source = 'foreign-affairs')
              ), '[]') AS "faBills"
       FROM leadership_role lr JOIN legislator l ON l.id = lr.legislator_id
       WHERE l.state = '${stateLit}'
       ORDER BY (l.chamber = 'senate') DESC,
         CASE
           WHEN lr.role ILIKE 'president pro%' OR lr.role ILIKE 'speaker' OR lr.role = 'President' THEN 1
           WHEN lr.role ILIKE 'speaker pro%' THEN 2
           WHEN lr.role ILIKE 'majority leader' OR lr.role ILIKE 'majority floor leader' THEN 3
           WHEN lr.role ILIKE '%majority%' THEN 4
           WHEN lr.role ILIKE 'minority leader' OR lr.role ILIKE 'minority floor leader' THEN 5
           WHEN lr.role ILIKE '%minority%' THEN 6
           ELSE 7
         END, lr.role, l.full_name`,
    );
  });
}
