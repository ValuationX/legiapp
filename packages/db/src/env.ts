import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the monorepo-root .env regardless of which workspace dir we're invoked from.
let dir = dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 6; i++) {
  const candidate = resolve(dir, '.env');
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = dirname(dir);
}

export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/legiapp';
