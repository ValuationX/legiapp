// Vercel serverless entry — runs the ENTIRE Fastify API as a single function.
// Vercel serves the built SPA statically and (per vercel.json) rewrites every
// /api/* request here, so the request still carries its original /api/... path for
// Fastify to route. Because the SPA and this function share one origin (your
// *.vercel.app domain), the shared-access-code cookie is first-party — no CORS.
//
// The Fastify app and its pg pool are created once at module load and reused across
// warm invocations. Set PGPOOL_MAX=1 and point DATABASE_URL at your managed
// Postgres' POOLED endpoint (e.g. Neon's -pooler host) so connections stay bounded.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildServer } from '../apps/api/src/server.js';

const app = buildServer();
const ready = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app.server.emit('request', req, res);
}
