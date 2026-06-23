import { CalendarQuery } from '@legiapp/shared';
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { stateOf } from '../state.js';

const SELECT = `SELECT id, date, type, title, detail,
        deadline_flag AS "deadlineFlag", source_url AS "sourceUrl",
        committee_id AS "committeeId", source, last_verified AS "lastVerified", conflict
   FROM calendar_event`;

export async function calendarRoutes(app: FastifyInstance) {
  // Legislative deadlines + statewide election milestones, with filters by type,
  // deadline-only, upcoming-only, and an explicit date range.
  app.get('/api/calendar', async (req) => {
    const { type, deadline, upcoming, from, to, limit } = CalendarQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    params.push(stateOf(req));
    where.push(`state = $${params.length}`);
    if (type) {
      params.push(type);
      where.push(`type = $${params.length}`);
    }
    if (deadline) where.push('deadline_flag = true');
    if (upcoming) where.push(`date >= date_trunc('day', now())`);
    if (from) {
      params.push(from);
      where.push(`date >= $${params.length}`);
    }
    if (to) {
      // Half-open upper bound so the inclusive `to` day captures all-day events
      // (pinned to noon UTC) and any time-of-day on the boundary date.
      params.push(to);
      where.push(`date < ($${params.length}::date + interval '1 day')`);
    }
    params.push(limit);
    return query(
      `${SELECT}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY date ASC
       LIMIT $${params.length}`,
      params,
    );
  });
}
