// Vercel serverless entry — runs the ENTIRE Fastify API as a single function.
// It imports a PRE-BUNDLED build of the API (apps/api/dist/vercel-bundle.js, produced
// by scripts/build-api.mjs during the Vercel build). Bundling inlines the workspace
// packages (@legiapp/db, @legiapp/shared) so there are no `.ts` source imports to
// resolve at runtime — the reason a plain transpile fails on Vercel. Real npm deps
// (fastify, pg, …) stay external and are traced/included by Vercel automatically.
//
// vercel.json routes every /api/* request here with the original URL preserved, so
// Fastify routes them exactly as it does locally. Set PGPOOL_MAX=1 and point
// DATABASE_URL at your managed Postgres' POOLED endpoint so connections stay bounded.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildServer } from '../apps/api/dist/vercel-bundle.js';

const app = buildServer();
const ready = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app.server.emit('request', req, res);
}
