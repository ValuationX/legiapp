import * as cheerio from 'cheerio';
import type pg from 'pg';
import { LEADERSHIP, POSITIONS } from './positions-guide.js';

/**
 * Enrich the PUBINFO roster with data only the chambers publish:
 *   • photos  — Assembly's stable per-district image URL (the UI falls back to an
 *               initials avatar when a given district's image is missing/404s).
 *   • leadership — curated, matched by name.
 *
 * Committee rosters/chairs are intentionally not scraped here: CA committee
 * membership is spread across dozens of inconsistent committee subdomains. The
 * clean machine-readable source is the Open States committees endpoint, wired in
 * the reconciliation phase — until then committee rosters render as "not synced".
 */
export async function enrichMembers(client: pg.Client): Promise<Record<string, number>> {
  await client.query(`
    UPDATE legislator
       SET photo_url = 'https://webapi.assembly.ca.gov/district-media/assets/members/assembly_member_'
                       || district || '.jpg',
           last_verified = now()
     WHERE chamber = 'assembly' AND full_name <> '(Vacant)' AND active = true`);

  // Leadership roster (full set from the positions guide), matched by district.
  await client.query(`DELETE FROM leadership_role WHERE source = 'positions-guide'`);
  let leadership = 0;
  for (const r of LEADERSHIP) {
    const res = await client.query(
      `INSERT INTO leadership_role (legislator_id, role, chamber, source)
       SELECT id, $1, $2::chamber, 'positions-guide' FROM legislator
       WHERE chamber = $2::chamber AND district = $3 AND active = true`,
      [r.role, r.chamber, r.district],
    );
    leadership += res.rowCount ?? 0;
  }

  // Issue positions (e.g. Ukraine support) — upsert from the guide's seeds.
  let positions = 0;
  for (const p of POSITIONS) {
    const res = await client.query(
      `INSERT INTO member_position (legislator_id, topic, stance, note, bill_id, source)
       SELECT l.id, $2, $3::stance, $4,
              (SELECT id FROM bill WHERE identifier = $5 ORDER BY measure_num LIMIT 1),
              'positions-guide'
       FROM legislator l WHERE l.chamber = $1::chamber AND l.district = $6 AND l.active = true
       ON CONFLICT (legislator_id, topic) DO UPDATE
         SET stance = EXCLUDED.stance, note = EXCLUDED.note, bill_id = EXCLUDED.bill_id,
             last_verified = now()`,
      [p.chamber, p.topic, p.stance, p.note ?? null, p.billIdentifier ?? null, p.district],
    );
    positions += res.rowCount ?? 0;
  }

  const { rows } = await client.query<{ photos: number }>(
    `SELECT count(*)::int AS photos FROM legislator WHERE photo_url IS NOT NULL`,
  );
  return { photos: rows[0]?.photos ?? 0, leadership, positions };
}

/**
 * Senate has no stable photo URL pattern (each sd##.senate.ca.gov site names the
 * file differently), but the headshot is consistently a `*headshot*` image on the
 * member's district site. Best-effort fetch each site and grab it; districts
 * without a recognizable headshot fall back to an initials avatar in the UI.
 */
export async function scrapeSenatePhotos(client: pg.Client): Promise<number> {
  const delay = Number(process.env.SCRAPE_DELAY_MS ?? 800);
  let found = 0;
  for (let d = 1; d <= 40; d++) {
    const nn = String(d).padStart(2, '0');
    const host = `https://sd${nn}.senate.ca.gov`;
    try {
      const res = await fetch(`${host}/`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const $ = cheerio.load(await res.text());
        let src = '';
        $('img').each((_, el) => {
          if (src) return;
          const s = $(el).attr('src') ?? '';
          if (/headshot/i.test(s)) src = s;
        });
        if (src) {
          const url = src.startsWith('http') ? src : `${host}${src.startsWith('/') ? '' : '/'}${src}`;
          const r = await client.query(
            `UPDATE legislator SET photo_url = $2, last_verified = now()
             WHERE chamber = 'senate' AND district = $1 AND active = true`,
            [d, url],
          );
          if (r.rowCount) found++;
        }
      }
    } catch {
      /* best effort — leave as avatar fallback */
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  return found;
}
