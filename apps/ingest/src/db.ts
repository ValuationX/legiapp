import { DATABASE_URL, pgSsl, withDbRetry } from '@legiapp/db';
import pg from 'pg';

export function createClient(): pg.Client {
  // keepAlive sends TCP probes so Neon doesn't drop the connection during long imports
  // that idle the socket between slow, rate-limited API fetches (the Open States v3 path).
  return new pg.Client({
    connectionString: DATABASE_URL,
    ssl: pgSsl(DATABASE_URL),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
}

export function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: pgSsl(DATABASE_URL) });
}

/** Connect a client, retrying the Windows 487 fork failures (see withDbRetry). */
export async function connectClient(): Promise<pg.Client> {
  return withDbRetry(async () => {
    const client = createClient();
    await client.connect();
    return client;
  });
}
