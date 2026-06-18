import { DATABASE_URL, pgSsl, withDbRetry } from '@legiapp/db';
import pg from 'pg';

// Explicit pool sizing (Postgres runs with max_connections=40; keep headroom for
// the ingest worker + psql). On serverless (Vercel) set PGPOOL_MAX=1 and point at a
// managed Postgres' pooled endpoint. Queries retry the Windows 487 fork failures.
export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: pgSsl(DATABASE_URL),
  max: Number(process.env.PGPOOL_MAX ?? 16),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[pg pool] idle client error:', err.message);
});

/** Run a parameterized query (retrying transient connection failures). */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withDbRetry(async () => {
    const res = await pool.query(sql, params);
    return res.rows as T[];
  });
}

/** Liveness ping for /api/health. */
export async function ping(): Promise<boolean> {
  try {
    await withDbRetry(() => pool.query('SELECT 1'), { attempts: 2 });
    return true;
  } catch {
    return false;
  }
}
