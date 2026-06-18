// Single shared access code gating the whole site (no per-user accounts). The org
// shares one code; entering it sets an httpOnly cookie. The cookie holds an HMAC of
// the code (never the code itself), so it's verifiable server-side without sessions
// and invalidates automatically if the code is rotated.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const ACCESS_COOKIE = 'legiapp_access';
const ACCESS_CODE = process.env.ACCESS_CODE ?? 'nova-ukraine-dev';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

if (!process.env.ACCESS_CODE) {
  console.warn('[access] ACCESS_CODE not set — using a dev code. Set ACCESS_CODE in production.');
}

function token(): string {
  return createHmac('sha256', ACCESS_CODE).update('legiapp-access-v1').digest('hex');
}

function eq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Constant-time check of a submitted code against the shared ACCESS_CODE. */
export function checkCode(input: string): boolean {
  return eq(input, ACCESS_CODE);
}

export function setAccessCookie(reply: FastifyReply): void {
  reply.setCookie(ACCESS_COOKIE, token(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
    secure: process.env.NODE_ENV === 'production',
  });
}

// Parse the cookie header manually so the access gate doesn't depend on
// @fastify/cookie's hook ordering during an onRequest hook.
function readCookie(req: FastifyRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}

/** True when the request carries a valid access cookie. */
export function hasAccess(req: FastifyRequest): boolean {
  const c = readCookie(req, ACCESS_COOKIE);
  return c !== undefined && eq(c, token());
}
