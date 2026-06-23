import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { ping } from './db.js';
import { billRoutes } from './routes/bills.js';
import { calendarRoutes } from './routes/calendar.js';
import { committeeRoutes } from './routes/committees.js';
import { districtRoutes } from './routes/districts.js';
import { foreignAffairsRoutes } from './routes/foreign-affairs.js';
import { leadershipRoutes } from './routes/leadership.js';
import { legislatorRoutes } from './routes/legislators.js';
import { metaRoutes } from './routes/meta.js';
import { miscRoutes } from './routes/misc.js';
import { voteRoutes } from './routes/votes.js';

export function buildServer() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

  // CORS restricted to the web origin(s) (comma-separated WEB_ORIGIN), with
  // credentials enabled for auth cookies.
  const allowed = (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim());
  app.register(cors, { origin: allowed, credentials: true });
  app.register(cookie);
  // Security headers (CSP off — this is a JSON API served separately from the SPA).
  app.register(helmet, { contentSecurityPolicy: false });
  // Generous global IP rate limit; auth routes set a much stricter per-route limit.
  app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'validation', issues: err.issues });
    }
    req.log.error(err);
    // Never reflect internal/DB error text on 5xx — only safe client errors (4xx)
    // expose their message. Prevents leaking Postgres/connection internals.
    const code = err.statusCode ?? 500;
    return reply.code(code).send({ error: code >= 500 ? 'internal error' : (err.message ?? 'error') });
  });

  // Cache-Control for public GET data. The dataset is a slow-changing legislative
  // snapshot (batch ingest), so the CDN/browser can serve repeat fetches without
  // re-hitting Postgres. Skips /api/health and any non-200/non-GET response; routes
  // may set their own Cache-Control first (this hook won't override it).
  app.addHook('onSend', async (req, reply, payload) => {
    if (
      req.method === 'GET' &&
      reply.statusCode === 200 &&
      !req.url.startsWith('/api/health') &&
      !reply.hasHeader('cache-control')
    ) {
      reply.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    }
    return payload;
  });

  app.get('/api/health', async (_req, reply) => {
    const dbOk = await ping();
    return reply.code(dbOk ? 200 : 503).send({ ok: dbOk, db: dbOk, ts: new Date().toISOString() });
  });

  // Public site — no access gate (the data is public record and ads need open access).
  app.register(legislatorRoutes);
  app.register(leadershipRoutes);
  app.register(billRoutes);
  app.register(committeeRoutes);
  app.register(voteRoutes);
  app.register(districtRoutes);
  app.register(calendarRoutes);
  app.register(foreignAffairsRoutes);
  app.register(miscRoutes);
  app.register(metaRoutes);

  return app;
}
