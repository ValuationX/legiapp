import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mapshaper from 'mapshaper';
import unzipper from 'unzipper';
import { connectClient } from '../db.js';
import { CACHE_DIR } from '../pubinfo/download.js';

// Census TIGER/Line 2024 state legislative districts for California (FIPS 06).
const SOURCES = [
  {
    chamber: 'assembly' as const,
    url: 'https://www2.census.gov/geo/tiger/TIGER2024/SLDL/tl_2024_06_sldl.zip',
    shp: 'tl_2024_06_sldl.shp',
    field: 'SLDLST',
  },
  {
    chamber: 'senate' as const,
    url: 'https://www2.census.gov/geo/tiger/TIGER2024/SLDU/tl_2024_06_sldu.zip',
    shp: 'tl_2024_06_sldu.shp',
    field: 'SLDUST',
  },
];

const DIR = resolve(CACHE_DIR, 'tiger');

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

export async function runDistricts(): Promise<{ assembly: number; senate: number }> {
  mkdirSync(DIR, { recursive: true });
  const client = await connectClient();
  const counts = { assembly: 0, senate: 0 };
  try {
    for (const src of SOURCES) {
      const zip = resolve(DIR, `${src.chamber}.zip`);
      await ensure(src.url, zip);

      // Extract shapefile + sidecars (.shp/.shx/.dbf/.prj) into DIR.
      const directory = await unzipper.Open.file(zip);
      for (const f of directory.files) {
        if (f.type === 'File') await pipeline(f.stream(), createWriteStream(resolve(DIR, basename(f.path))));
      }

      // Convert + simplify to web-friendly WGS84 GeoJSON (no GDAL needed).
      const out = resolve(DIR, `${src.chamber}.geojson`);
      await mapshaper.runCommands(
        `-i "${resolve(DIR, src.shp)}" -proj wgs84 -simplify 8% keep-shapes -o "${out}" format=geojson`,
      );
      const fc = JSON.parse(readFileSync(out, 'utf8')) as { features: Feature[] };

      for (const feat of fc.features) {
        const code = feat.properties[src.field];
        const number = Number.parseInt(code ?? '', 10);
        if (!code || code === 'ZZZ' || !Number.isFinite(number)) continue;
        await client.query(
          `INSERT INTO district (id, chamber, number, boundary_set, geojson, current_legislator_id, source)
           VALUES ($1, $2, $3, 'current', $4::jsonb,
             (SELECT id FROM legislator WHERE chamber = $2 AND district = $3 LIMIT 1), 'tiger')
           ON CONFLICT (id) DO UPDATE
             SET geojson = EXCLUDED.geojson,
                 current_legislator_id = EXCLUDED.current_legislator_id,
                 last_verified = now()`,
          [`${src.chamber}-${number}-current`, src.chamber, number, JSON.stringify(feat.geometry)],
        );
        counts[src.chamber]++;
      }
      console.log(`  ↳ ${src.chamber}: ${counts[src.chamber]} districts`);
    }
    return counts;
  } finally {
    await client.end();
  }
}
