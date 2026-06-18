#!/usr/bin/env node
// Portable local PostgreSQL manager — no Docker, no admin, no system install.
//
// Uses the real Postgres *server* binaries bundled by the `embedded-postgres`
// npm package (initdb / pg_ctl / postgres) and drives them with `pg_ctl`, which
// starts the server detached so it survives after this script exits (a normal
// persistent dev database). Client work (create db, ad-hoc SQL) goes through the
// node-postgres client, because embedded-postgres does not ship psql/createdb.
//
//   node scripts/db.mjs start          # init (first run) + start + ensure legiapp db
//   node scripts/db.mjs stop
//   node scripts/db.mjs status
//   node scripts/db.mjs sql "SELECT 1" # run a one-off query against legiapp
//   node scripts/db.mjs reset          # stop + delete the data dir (destructive)
//
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import pg from 'pg';

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const PG_HOME = join(ROOT, '.postgres');
const DATA_DIR = join(PG_HOME, 'data');
const LOG_FILE = join(PG_HOME, 'postgres.log');
const PW_FILE = join(PG_HOME, '.pwfile');

const PORT = process.env.PGPORT || '5433';
const HOST = '127.0.0.1';
const SUPERUSER = 'postgres';
const PASSWORD = 'postgres';
const APP_DB = 'legiapp';

const IS_WIN = process.platform === 'win32';
const EXE = IS_WIN ? '.exe' : '';

function resolveBinDir() {
  const platformDir = {
    'win32:x64': 'windows-x64',
    'darwin:arm64': 'darwin-arm64',
    'darwin:x64': 'darwin-x64',
    'linux:x64': 'linux-x64',
    'linux:arm64': 'linux-arm64',
  }[`${process.platform}:${process.arch}`];
  if (!platformDir) throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
  // The platform package blocks require.resolve on its files via "exports",
  // so locate the bundled binaries by their known on-disk layout instead.
  const candidates = [join(ROOT, 'node_modules', '@embedded-postgres', platformDir, 'native', 'bin')];
  try {
    const epDir = dirname(require.resolve('embedded-postgres'));
    candidates.push(join(epDir, '..', '@embedded-postgres', platformDir, 'native', 'bin'));
    candidates.push(join(epDir, 'node_modules', '@embedded-postgres', platformDir, 'native', 'bin'));
  } catch {
    /* rely on the ROOT candidate */
  }
  for (const dir of candidates) {
    if (existsSync(join(dir, 'pg_ctl' + EXE))) return resolve(dir);
  }
  throw new Error(`Could not find Postgres binaries. Looked in:\n  ${candidates.join('\n  ')}\nRun \`npm install\` first.`);
}

const BIN = resolveBinDir();
const bin = (name) => join(BIN, name + EXE);

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'inherit' }).status ?? 1;
}
function capture(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  return { status: res.status ?? 1, stdout: (res.stdout || '').trim() };
}

const isInitialised = () => existsSync(join(DATA_DIR, 'PG_VERSION'));
const isRunning = () => capture(bin('pg_ctl'), ['status', '-D', DATA_DIR]).status === 0;

function init() {
  mkdirSync(PG_HOME, { recursive: true });
  writeFileSync(PW_FILE, PASSWORD, 'utf8');
  console.log('• Initialising database cluster…');
  const status = run(bin('initdb'), [
    '-D', DATA_DIR, '-U', SUPERUSER, `--pwfile=${PW_FILE}`,
    '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--encoding=UTF8', '--locale=C',
  ]);
  rmSync(PW_FILE, { force: true });
  if (status !== 0) throw new Error('initdb failed');
}

// Windows + embedded Postgres intermittently fails to fork a connection child
// ("could not reserve shared memory region ... error code 487"). Retrying with a
// fresh fork almost always succeeds.
function isTransient(e) {
  const c = e && e.code;
  const m = String((e && e.message) || '');
  return (
    c === 'ECONNRESET' || c === 'ECONNREFUSED' || c === '57P03' || c === '08006' || c === '08003' ||
    m.includes('ECONNRESET') || m.includes('Connection terminated')
  );
}

async function withClient(database, fn) {
  let lastErr;
  for (let i = 0; i < 12; i++) {
    const client = new pg.Client({ host: HOST, port: Number(PORT), user: SUPERUSER, password: PASSWORD, database });
    try {
      await client.connect();
      const result = await fn(client);
      await client.end();
      return result;
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      lastErr = e;
      if (!isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

async function ensureAppDb() {
  await withClient('postgres', async (client) => {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [APP_DB]);
    if (rows.length === 0) {
      console.log(`• Creating database "${APP_DB}"…`);
      await client.query(`CREATE DATABASE ${APP_DB}`);
    }
  });
}

async function start() {
  if (!isInitialised()) init();
  if (isRunning()) {
    console.log(`✓ Postgres already running on port ${PORT}`);
  } else {
    mkdirSync(PG_HOME, { recursive: true });
    console.log(`• Starting Postgres on port ${PORT}…`);
    const status = run(bin('pg_ctl'), [
      'start', '-w', '-D', DATA_DIR, '-l', LOG_FILE,
      // Smaller shared-memory footprint + no parallel-worker forks reduces the
      // Windows "could not reserve shared memory region (error 487)" failures.
      '-o',
      `-p ${PORT} -c listen_addresses=${HOST} -c shared_buffers=32MB ` +
        `-c max_connections=40 -c max_parallel_workers_per_gather=0 -c max_worker_processes=2`,
    ]);
    if (status !== 0) {
      console.error(`✗ Failed to start. See log: ${LOG_FILE}`);
      process.exit(1);
    }
  }
  await ensureAppDb();
  console.log(`✓ Ready: postgres://${SUPERUSER}:****@${HOST}:${PORT}/${APP_DB}`);
}

function stop() {
  if (!isRunning()) return console.log('• Postgres not running');
  run(bin('pg_ctl'), ['stop', '-w', '-m', 'fast', '-D', DATA_DIR]);
  console.log('✓ Stopped');
}

function status() {
  process.exit(run(bin('pg_ctl'), ['status', '-D', DATA_DIR]));
}

async function sql() {
  const query = process.argv[3];
  if (!query) throw new Error('Usage: node scripts/db.mjs sql "SELECT …"');
  await withClient(APP_DB, async (client) => {
    const res = await client.query(query);
    console.table(res.rows);
  });
}

function reset() {
  if (isRunning()) stop();
  rmSync(DATA_DIR, { recursive: true, force: true });
  console.log('✓ Data directory removed');
}

const actions = { start, stop, status, sql, reset };
const cmd = process.argv[2];
if (!actions[cmd]) {
  console.error(`Usage: node scripts/db.mjs <${Object.keys(actions).join('|')}>`);
  process.exit(1);
}
try {
  await actions[cmd]();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
