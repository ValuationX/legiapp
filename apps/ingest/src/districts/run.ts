import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getState } from '@legiapp/shared';
import mapshaper from 'mapshaper';
import unzipper from 'unzipper';
import { connectClient } from '../db.js';
import { CACHE_DIR } from '../pubinfo/download.js';

// Census TIGER/Line 2024 state legislative districts. Per-state via the FIPS code in
// the registry; the SLDL/SLDU layers + SLDLST/SLDUST number fields are uniform across
// states. District ids are state-prefixed (`${state}-${chamber}-${number}-current`),
// matching what's already in the DB, so re-running California is an in-place refresh.
function sourcesFor(fips: string) {
  return [
    {
      chamber: 'assembly' as const,
      url: `https://www2.census.gov/geo/tiger/TIGER2024/SLDL/tl_2024_${fips}_sldl.zip`,
      shp: `tl_2024_${fips}_sldl.shp`,
      field: 'SLDLST',
    },
    {
      chamber: 'senate' as const,
      url: `https://www2.census.gov/geo/tiger/TIGER2024/SLDU/tl_2024_${fips}_sldu.zip`,
      shp: `tl_2024_${fips}_sldu.shp`,
      field: 'SLDUST',
    },
  ];
}

async function ensure(url: string, dest: string): Promise<void> {
  if (existsSync(dest) && statSync(dest).size > 0) return;
  console.log(`  • downloading ${basename(dest)}…`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(dest));
}

interface Feature {
  type: 'Feature';
  geometry: unknown;
  properties: Record<string, string>;
}

export async function runDistricts(stateRaw = 'CA'): Promise<{ assembly: number; senate: number }> {
  const cfg = getState(stateRaw);
  if (!cfg) throw new Error(`unknown state: ${stateRaw}`);
  const state = cfg.code;
  // Per-state cache dir so chamber zip/geojson temp files don't collide across states.
  const dir = resolve(CACHE_DIR, 'tiger', state);
  mkdirSync(dir, { recursive: true });
  const client = await connectClient();
  const counts = { assembly: 0, senate: 0 };
  try {
    for (const src of sourcesFor(cfg.fips)) {
      const zip = resolve(dir, `${src.chamber}.zip`);
      await ensure(src.url, zip);

      // Extract shapefile + sidecars (.shp/.shx/.dbf/.prj) into dir.
      const directory = await unzipper.Open.file(zip);
      for (const f of directory.files) {
        if (f.type === 'File') await pipeline(f.stream(), createWriteStream(resolve(dir, basename(f.path))));
      }

      // Convert + simplify to web-friendly WGS84 GeoJSON (no GDAL needed).
      const out = resolve(dir, `${src.chamber}.geojson`);
      await mapshaper.runCommands(
        `-i "${resolve(dir, src.shp)}" -proj wgs84 -simplify 8% keep-shapes -o "${out}" format=geojson`,
      );
      const fc = JSON.parse(readFileSync(out, 'utf8')) as { features: Feature[] };

      for (const feat of fc.features) {
        const code = feat.properties[src.field];
        const number = Number.parseInt(code ?? '', 10);
        if (!code || code === 'ZZZ' || !Number.isFinite(number)) continue;
        await client.query(
          `INSERT INTO district (id, state, chamber, number, boundary_set, geojson, current_legislator_id, source)
           VALUES ($1, $2, $3, $4, 'current', $5::jsonb,
             (SELECT id FROM legislator WHERE state = $2 AND chamber = $3 AND district = $4 AND active = true LIMIT 1),
             'tiger')
           ON CONFLICT (id) DO UPDATE
             SET geojson = EXCLUDED.geojson,
                 current_legislator_id = EXCLUDED.current_legislator_id,
                 last_verified = now()`,
          [`${state}-${src.chamber}-${number}-current`, state, src.chamber, number, JSON.stringify(feat.geometry)],
        );
        counts[src.chamber]++;
      }
      console.log(`  ↳ ${state} ${src.chamber}: ${counts[src.chamber]} districts`);
    }
    return counts;
  } finally {
    await client.end();
  }
}
