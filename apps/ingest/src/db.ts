import { DATABASE_URL, pgSsl, withDbRetry } from '@legiapp/db';
import pg from 'pg';

export function createClient(): pg.Client {
  return new pg.Client({ connectionString: DATABASE_URL, ssl: pgSsl(DATABASE_URL) });
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
