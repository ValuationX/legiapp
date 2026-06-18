import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import pg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { parseDat, toPgTextLine, type Row } from './parser.js';
import { PUBINFO_TABLES, type PubinfoTable } from './tables.js';

/** TRUNCATE a staging table and bulk-load a .dat file into it via COPY. */
export async function loadStagingTable(
  client: pg.Client,
  table: PubinfoTable,
  datPath: string,
): Promise<number> {
  await client.query(`TRUNCATE ${table.table}`);

  const sql = `COPY ${table.table} (${table.columns.join(', ')}) FROM STDIN WITH (FORMAT text)`;
  const copyStream = client.query(copyFrom(sql));
  const width = table.columns.length;
  let rows = 0;

  const writeRow = async (row: Row) => {
    // The parser guarantees field count for well-formed data; defensively
    // normalize width so a stray row can never corrupt column alignment.
    if (row.length < width) row = [...row, ...Array(width - row.length).fill(null)];
    else if (row.length > width) row = row.slice(0, width);
    rows++;
    if (!copyStream.write(toPgTextLine(row) + '\n')) await once(copyStream, 'drain');
  };

  await parseDat(datPath, writeRow);
  copyStream.end();
  await finished(copyStream);
  return rows;
}

/** Load all configured staging tables from a map of dat-name -> path. */
export async function loadAllStaging(
  client: pg.Client,
  datPaths: Map<string, string>,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of PUBINFO_TABLES) {
    const path = datPaths.get(table.dat);
    if (!path) {
      console.warn(`  ! skipping ${table.table} — ${table.dat} not extracted`);
      continue;
    }
    const n = await loadStagingTable(client, table, path);
    counts[table.table] = n;
    console.log(`  ↳ ${table.table.padEnd(34)} ${n.toLocaleString()} rows`);
  }
  return counts;
}
