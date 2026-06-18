import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { hasAccess } from './access.js';
import { ping } from './db.js';
import { accessRoutes } from './routes/access.js';
import { billRoutes } from './routes/bills.js';
import { calendarRoutes } from './routes/calendar.js';
import { committeeRoutes } from './routes/committees.js';
import { districtRoutes } from './routes/districts.js';
import { foreignAffairsRoutes } from './routes/foreign-affairs.js';
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
    return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'internal error' });
  });

  app.get('/api/health', async (_req, reply) => {
    const dbOk = await ping();
    return reply.code(dbOk ? 200 : 503).send({ ok: dbOk, db: dbOk, ts: new Date().toISOString() });
  });

  // Shared-access-code gate: everything except health + the access endpoints
  // requires a valid access cookie.
  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0];
    if (path === '/api/health' || path === '/api/access' || path === '/api/access/status') return;
    if (!hasAccess(req)) return reply.code(401).send({ error: 'access code required' });
  });

  app.register(accessRoutes);
  app.register(legislatorRoutes);
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
