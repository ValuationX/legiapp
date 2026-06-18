import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DATABASE_URL } from './env.js';
import * as schema from './schema.js';

/**
 * TLS settings for a pg connection. Managed Postgres (Neon, Supabase, RDS, …)
 * requires TLS; the local/portable Postgres and the docker-compose internal `db`
 * host do not. Enabled when DATABASE_SSL=true, or the connection string itself asks
 * for it (`sslmode=require`/`verify-*`, or a *.neon.tech host). `rejectUnauthorized:
 * false` keeps the channel encrypted without pinning the provider's CA chain.
 */
export function pgSsl(connectionString: string = DATABASE_URL): pg.PoolConfig['ssl'] {
  const wants =
    process.env.DATABASE_SSL === 'true' ||
    /sslmode=(require|verify-ca|verify-full)/.test(connectionString) ||
    /\.neon\.tech/.test(connectionString);
  return wants ? { rejectUnauthorized: false } : undefined;
}

export function createPool(connectionString: string = DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString, ssl: pgSsl(connectionString) });
}

export function createDb(pool: pg.Pool = createPool()) {
  return drizzle(pool, { schema });
}

export type DB = ReturnType<typeof createDb>;
export { schema };
