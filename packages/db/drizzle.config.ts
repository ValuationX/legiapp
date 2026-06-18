import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load the monorepo-root .env by walking up from the current working directory.
let dir = process.cwd();
for (let i = 0; i < 6; i++) {
  const candidate = resolve(dir, '.env');
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
  dir = dirname(dir);
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/legiapp',
  },
  schemaFilter: ['public', 'raw'],
  verbose: true,
  strict: true,
});
