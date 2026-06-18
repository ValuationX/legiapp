// Legislator contact info (email + capitol/district phone + office address) for
// CURRENT members — key-free from the OpenStates People repo (data/ca/legislature/*.yml).
// PUBINFO has no contact details; OpenStates' API form is key-gated, but the same
// data lives in the public GitHub repo. Matched to our roster by chamber + district.
import yaml from 'js-yaml';
import { connectClient } from '../db.js';

const DIR_API = 'https://api.github.com/repos/openstates/people/contents/data/ca/legislature';

// A few current members carry a dead or non-official headshot in OpenStates People
// (e.g. 2024-elected members whose `image` still points at a campaign/news URL that
// now 404s). Pin those to a stable OFFICIAL in-office portrait — the Assembly
// district-media API, or the member's official State Senate headshot — keyed by
// `chamber:district`. Verified reachable; takes priority over the OpenStates image.
const PHOTO_OVERRIDES: Record<string, string> = {
  'assembly:19':
    'https://webapi.assembly.ca.gov/district-media/assets/members/assembly_member_19.jpg', // Catherine Stefani
  'assembly:43':
    'https://webapi.assembly.ca.gov/district-media/assets/members/assembly_member_43.jpg', // Celeste Rodriguez
  'senate:36':
    'https://upload.wikimedia.org/wikipedia/commons/2/25/Senator_Tony_Strickland_-_California_State_Senate_Official_Headshot.jpg', // Tony Strickland
};

interface PersonYaml {
  name?: string;
  email?: string;
  image?: string; // headshot URL (present for all current CA members, incl. Senate)
  offices?: { classification?: string; address?: string; voice?: string }[];
  roles?: { type?: string; district?: string; end_date?: string }[];
}

interface GhFile {
  name: string;
  download_url: string | null;
  type: string;
}

export async function runContacts(): Promise<{ updated: number }> {
  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('contacts', 'enrich', 'running') RETURNING id`,
  );
  const runId = runRows[0]!.id;
  try {
    const res = await fetch(DIR_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'legiapp-ingest' },
    });
    if (!res.ok) throw new Error(`GitHub listing failed: ${res.status}`);
    const files = ((await res.json()) as GhFile[]).filter((f) => f.type === 'file' && f.name.endsWith('.yml'));
    console.log(`• Contacts from OpenStates People (${files.length} members)…`);

    let updated = 0;
    for (const f of files) {
      if (!f.download_url) continue;
      const raw = await fetch(f.download_url, { headers: { 'User-Agent': 'legiapp-ingest' } });
      if (!raw.ok) continue;
      const y = yaml.load(await raw.text()) as PersonYaml;
      // Current role = the legislative role with no end date.
      const role = (y.roles ?? []).find((r) => !r.end_date && (r.type === 'lower' || r.type === 'upper'));
      if (!role) continue;
      const chamber = role.type === 'lower' ? 'assembly' : 'senate';
      const district = Number.parseInt(role.district ?? '', 10);
      if (!Number.isFinite(district)) continue;

      const offices = y.offices ?? [];
      const cap = offices.find((o) => o.classification === 'capitol') ?? offices[0];
      const phone = cap?.voice ?? offices.map((o) => o.voice).find(Boolean) ?? null;
      const office = cap?.address ?? null;
      // OpenStates People carries a headshot for every current member (incl. Senate,
      // which PUBINFO/scrape miss) — authoritative, so overwrite to fill all 120.
      // A pinned official override wins where that headshot is dead/non-official.
      const photo =
        PHOTO_OVERRIDES[`${chamber}:${district}`] ??
        (y.image && /^https?:\/\//.test(y.image) ? y.image : null);

      const r = await client.query(
        `UPDATE legislator
           SET email = COALESCE($3, email), phone = COALESCE($4, phone),
               office = COALESCE($5, office), photo_url = COALESCE($6, photo_url), last_verified = now()
         WHERE chamber = $1::chamber AND district = $2 AND active = true`,
        [chamber, district, y.email ?? null, phone, office, photo],
      );
      updated += r.rowCount ?? 0;
    }

    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      { updated },
    ]);
    console.log(`  ↳ contacts: updated ${updated} current members`);
    return { updated };
  } catch (err) {
    await client
      .query(`UPDATE ingest_run SET status='error', finished_at=now(), error=$2 WHERE id=$1`, [
        runId,
        String((err as Error)?.message ?? err),
      ])
      .catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
