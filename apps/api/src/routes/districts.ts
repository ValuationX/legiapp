import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { stateOf } from '../state.js';

interface Row {
  number: number;
  geojson: unknown;
  leg_id: string | null;
  full_name: string | null;
  party: string | null;
  photo_url: string | null;
}

export async function districtRoutes(app: FastifyInstance) {
  // GeoJSON FeatureCollection for a chamber; member summary embedded in each
  // feature's properties so the map renders + handles clicks without extra calls.
  app.get('/api/districts/:chamber', async (req, reply) => {
    const { chamber } = req.params as { chamber: string };
    if (chamber !== 'assembly' && chamber !== 'senate') {
      return reply.code(400).send({ error: 'chamber must be assembly or senate' });
    }
    // boundary set is "current" today; "proposed" is ready for when CA publishes
    // redistricting maps (same district-ingest pipeline loads them).
    const boundarySet = (req.query as { boundarySet?: string }).boundarySet === 'proposed' ? 'proposed' : 'current';
    const state = stateOf(req);
    const rows = await query<Row>(
      `SELECT d.number, d.geojson,
              l.id AS leg_id, l.full_name, l.party, l.photo_url
       FROM district d
       LEFT JOIN legislator l ON l.id = d.current_legislator_id
       WHERE d.state = $1 AND d.chamber = $2 AND d.boundary_set = $3
       ORDER BY d.number`,
      [state, chamber, boundarySet],
    );
    return {
      type: 'FeatureCollection',
      features: rows.map((r) => ({
        type: 'Feature',
        geometry: r.geojson,
        properties: {
          chamber,
          district: r.number,
          legislatorId: r.leg_id,
          member: r.full_name,
          party: r.party,
          photoUrl: r.photo_url,
        },
      })),
    };
  });
}
