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

/**
 * A `LEFT JOIN LATERAL` that, given a (possibly old-session) legislator row aliased
 * `lAlias`, finds that same person's CURRENT active record — by source_person_id when
 * present, else by state + chamber + first/last name (never district: redistricting).
 * Use `<outAlias>.id` (COALESCE with the historical id) so reference links point at
 * the person's live profile when they still serve. Aliases are code constants — safe.
 */
export const currentLegislatorLateral = (lAlias = 'l', outAlias = 'curlnk'): string => `
  LEFT JOIN LATERAL (
    SELECT cur.id FROM legislator cur
    WHERE cur.active = true AND cur.state = ${lAlias}.state
      AND ( (${lAlias}.source_person_id IS NOT NULL AND cur.source_person_id = ${lAlias}.source_person_id)
         OR (${lAlias}.source_person_id IS NULL AND cur.source_person_id IS NULL
             AND cur.chamber = ${lAlias}.chamber
             AND lower(cur.last_name) = lower(${lAlias}.last_name)
             AND lower(coalesce(cur.first_name, '')) = lower(coalesce(${lAlias}.first_name, ''))) )
    ORDER BY cur.session_year DESC LIMIT 1
  ) ${outAlias} ON true`;

/** Liveness ping for /api/health. */
export async function ping(): Promise<boolean> {
  try {
    await withDbRetry(() => pool.query('SELECT 1'), { attempts: 2 });
    return true;
  } catch {
    return false;
  }
}
