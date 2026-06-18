// Vercel serverless entry — runs the ENTIRE Fastify API as a single function.
// vercel.json routes every /api/* request here (via `routes`), and Vercel preserves
// the original request URL, so Fastify routes them exactly as it does locally. The SPA
// is served statically; all non-/api paths fall back to index.html for client routing.
//
// The Fastify app and its pg pool are created once at module load and reused across
// warm invocations. Set PGPOOL_MAX=1 and point DATABASE_URL at your managed Postgres'
// POOLED endpoint (e.g. Neon's -pooler host) so connections stay bounded.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildServer } from '../apps/api/src/server.js';

const app = buildServer();
const ready = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app.server.emit('request', req, res);
}
