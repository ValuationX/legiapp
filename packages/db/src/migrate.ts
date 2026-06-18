import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { pgSsl } from './client.js';
import { DATABASE_URL } from './env.js';
import { withDbRetry } from './retry.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, '..', 'drizzle');

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: pgSsl() });
const db = drizzle(pool);

console.log(`• Applying migrations from ${migrationsFolder}`);
await withDbRetry(() => migrate(db, { migrationsFolder }));
await pool.end();
console.log('✓ Migrations applied');
