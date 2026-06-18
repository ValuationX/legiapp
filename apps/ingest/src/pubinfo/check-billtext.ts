// Dev sanity check: parse one bill LOB and print extracted digest + body.
// Run: npx tsx apps/ingest/src/pubinfo/check-billtext.ts
import unzipper from 'unzipper';
import { parseBillXml } from './billtext.js';
import { resolveArchive } from './download.js';

const { zipPath } = resolveArchive();
const dir = await unzipper.Open.file(zipPath);
const entry = dir.files.find((f) => /BILL_VERSION_TBL_\d+\.lob$/i.test(f.path));
if (!entry) {
  console.log('no LOB found');
} else {
  const xml = (await entry.buffer()).toString('utf8');
  const { digest, fullText } = parseBillXml(xml);
  console.log('file:', entry.path);
  console.log('digest:', digest?.slice(0, 220));
  console.log('fullText len:', fullText?.length, '| sample:', fullText?.slice(0, 160));
}
