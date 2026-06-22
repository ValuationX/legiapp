import { DEFAULT_STATE, type StateCode, isStateCode } from '@legiapp/shared';
import type { FastifyRequest } from 'fastify';

/**
 * Resolve the requested state from `?state` for ANY route, validated against the
 * configured registry (packages/shared/src/states.ts). Unknown or absent → the
 * default state (CA). The result is always a known 2-letter code, so it is safe to
 * inline into SQL as well as pass as a parameter.
 *
 * This is the single source of truth for state resolution. Adding a state to the
 * registry makes it accepted here automatically — no route changes needed.
 */
export function stateOf(req: FastifyRequest): StateCode {
  const raw = (req.query as { state?: unknown } | undefined)?.state;
  const up = typeof raw === 'string' ? raw.toUpperCase() : '';
  return isStateCode(up) ? up : DEFAULT_STATE;
}
