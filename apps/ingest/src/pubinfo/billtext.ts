import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import * as cheerio from 'cheerio';
import pg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import unzipper from 'unzipper';
import { toPgTextLine } from './parser.js';

/**
 * Parse a California CAML bill-version XML document into searchable text:
 *  - `digest`   — the Legislative Counsel's Digest (`<caml:DigestText>`)
 *  - `fullText` — the full bill body (`<caml:Bill>` … `<caml:BillSection>`)
 */
export function parseBillXml(xml: string): { digest: string | null; fullText: string | null } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const clean = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length ? t : null;
  };
  // Digest for display; whole-document text for search recall — capturing the
  // entire measure body works for bills (<caml:Bill>) AND resolutions
  // (<caml:Resolution>) and anything else, so a keyword like "Ukraine" buried in
  // a resolution's resolved clauses is still indexed.
  const root = $('caml\\:MeasureDoc');
  const wholeText = root.length ? root.text() : $.root().text();
  return {
    digest: clean($('caml\\:DigestText').first().text()),
    fullText: clean(wholeText),
  };
}

/**
 * Extract each bill's latest-version XML LOB from the cached archive, parse it,
 * and load digest + full text into the `bill` table (via a temp table + COPY,
 * one UPDATE) so search can cover bill content, not just titles.
 */
export async function ingestBillText(client: pg.Client, zipPath: string): Promise<{ updated: number }> {
  const { rows } = await client.query<{ bill_id: string; lob: string }>(
    `SELECT b.id AS bill_id, v.bill_xml_file AS lob
     FROM bill b
     JOIN raw.bill_version_tbl v ON v.bill_version_id = b.latest_version_id
     WHERE v.bill_xml_file IS NOT NULL`,
  );
  console.log(`  • ${rows.length} bills have a latest-version document`);

  // Index the archive's entries by basename for O(1) lookup.
  const directory = await unzipper.Open.file(zipPath);
  const byName = new Map<string, (typeof directory.files)[number]>();
  for (const f of directory.files) {
    if (f.type === 'File') byName.set(basename(f.path).toLowerCase(), f);
  }

  await client.query('DROP TABLE IF EXISTS tmp_bill_text');
  await client.query('CREATE TEMP TABLE tmp_bill_text (bill_id text, digest text, full_text text)');

  const copyStream = client.query(
    copyFrom('COPY tmp_bill_text (bill_id, digest, full_text) FROM STDIN WITH (FORMAT text)'),
  );

  let updated = 0;
  let missing = 0;
  for (const { bill_id, lob } of rows) {
    const entry = byName.get(basename(lob).toLowerCase());
    if (!entry) {
      missing++;
      continue;
    }
    const buf = await entry.buffer();
    const { digest, fullText } = parseBillXml(buf.toString('utf8'));
    if (!copyStream.write(toPgTextLine([bill_id, digest, fullText]) + '\n')) {
      await once(copyStream, 'drain');
    }
    updated++;
    if (updated % 1000 === 0) console.log(`  • parsed ${updated}…`);
  }

  copyStream.end();
  await finished(copyStream);

  await client.query(`
    UPDATE bill SET digest = t.digest,
                    full_text = t.full_text,
                    summary = COALESCE(t.digest, bill.summary)
    FROM tmp_bill_text t WHERE bill.id = t.bill_id`);

  if (missing) console.log(`  ! ${missing} LOBs not found in archive`);
  return { updated };
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}
