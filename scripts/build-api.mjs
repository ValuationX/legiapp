// Bundles the Fastify API into a single self-contained ESM file for the Vercel
// serverless function. Inlines the workspace packages (@legiapp/db, @legiapp/shared)
// and the api source — so the deployed function has no `.ts`-source module resolution
// at runtime (the cause of ERR_MODULE_NOT_FOUND on Vercel). Real npm dependencies are
// kept external and resolved from node_modules (Vercel traces + includes them).
//
// Run by the Vercel build (see vercel.json buildCommand) and reproducible locally:
//   node scripts/build-api.mjs
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The codebase uses NodeNext-style ".js" specifiers that point at ".ts" source.
// esbuild doesn't remap those by default, so do it for relative imports.
const jsToTs = {
  name: 'js-to-ts',
  setup(b) {
    b.onResolve({ filter: /\.js$/ }, (args) => {
      if (!args.path.startsWith('.')) return; // only our relative source, not node_modules
      const ts = resolve(args.resolveDir, `${args.path.slice(0, -3)}.ts`);
      if (existsSync(ts)) return { path: ts };
      return; // fall back to esbuild's default resolution
    });
  },
};

// Real npm packages stay external (resolved at runtime); only @legiapp/* + relative
// source get inlined. fastify/pg in particular don't bundle cleanly, so keep external.
const external = [
  'fastify',
  '@fastify/cookie',
  '@fastify/cors',
  '@fastify/helmet',
  '@fastify/rate-limit',
  'pg',
  'pg-native',
  'drizzle-orm',
  'zod',
  'bcryptjs',
  'jsonwebtoken',
  'dotenv',
];

await build({
  entryPoints: ['apps/api/src/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'apps/api/dist/vercel-bundle.js',
  external,
  plugins: [jsToTs],
  logLevel: 'warning',
});

console.log('API bundled -> apps/api/dist/vercel-bundle.js');
