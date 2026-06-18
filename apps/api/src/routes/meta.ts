import { STATES, STATE_CODES } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

export async function metaRoutes(app: FastifyInstance) {
  // States the app serves (display config) + how much data is loaded for each. The
  // web app uses this to populate the state selector and render state-aware labels.
  app.get('/api/meta/states', async () => {
    const loaded = await query<{ state: string; bills: number }>(
      `SELECT state, count(*)::int AS bills FROM bill GROUP BY state`,
    );
    const billsByState = new Map(loaded.map((r) => [r.state, r.bills]));
    return STATE_CODES.map((code) => {
      const s = STATES[code];
      return {
        code: s.code,
        name: s.name,
        lowerLabel: s.lowerLabel,
        upperLabel: s.upperLabel,
        lowerShort: s.lowerShort,
        upperShort: s.upperShort,
        lowerSeats: s.lowerSeats,
        upperSeats: s.upperSeats,
        mapCenter: s.mapCenter,
        mapZoom: s.mapZoom,
        billsLoaded: billsByState.get(code) ?? 0,
      };
    }).filter((s) => s.billsLoaded > 0 || s.code === 'CA'); // only states with data (CA always)
  });
}
