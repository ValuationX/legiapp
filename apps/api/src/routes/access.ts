import type { FastifyInstance } from 'fastify';
import { checkCode, hasAccess, setAccessCookie } from '../access.js';

export async function accessRoutes(app: FastifyInstance) {
  // Submit the shared code (throttled against brute force).
  app.post(
    '/api/access',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const { code } = (req.body ?? {}) as { code?: string };
      if (!code || !checkCode(code)) return reply.code(401).send({ error: 'invalid access code' });
      setAccessCookie(reply);
      return { ok: true };
    },
  );

  app.get('/api/access/status', async (req) => ({ authorized: hasAccess(req) }));
}
