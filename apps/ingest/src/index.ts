import { runCalendar } from './calendar/run.js';
import { runCommittees } from './committees/run.js';
import { runContacts } from './contacts/run.js';
import { runForeignAffairs } from './foreign-affairs/run.js';
import { runDistricts } from './districts/run.js';
import { runAugmentCa } from './openstates/augment-ca.js';
import { runOpenStates } from './openstates/run.js';
import { runStateImport } from './openstates/import-state.js';
import { runAll } from './pipeline.js';
import { runPubinfo } from './pubinfo/run.js';
import { startScheduler } from './scheduler.js';
import { runScrape } from './scrape/run.js';
import { runSubjects } from './subjects/run.js';

// CLI: tsx src/index.ts [all|pubinfo|scrape|openstates|committees|subjects|foreign-affairs|districts|calendar|state <CODE>|schedule]
const cmd = process.argv[2] ?? 'all';

try {
  if (cmd === 'pubinfo') await runPubinfo(process.argv[3]); // optional archive, e.g. `pubinfo 2021`
  else if (cmd === 'scrape') await runScrape();
  else if (cmd === 'openstates') await runOpenStates();
  else if (cmd === 'committees') await runCommittees();
  else if (cmd === 'contacts') await runContacts();
  else if (cmd === 'subjects') await runSubjects();
  else if (cmd === 'foreign-affairs') await runForeignAffairs();
  else if (cmd === 'districts') await runDistricts();
  else if (cmd === 'calendar') await runCalendar();
  else if (cmd === 'state') await runStateImport(process.argv[3] ?? ''); // e.g. `state NY` — Open States primary import
  else if (cmd === 'augment-ca') await runAugmentCa(); // add missing CA foreign-affairs bills from Open States CSVs
  else if (cmd === 'schedule') startScheduler(); // long-running; never exits
  else await runAll();

  if (cmd !== 'schedule') {
    console.log('✓ Done.');
    process.exit(0);
  }
} catch (err) {
  console.error('✗ Ingest failed:', err);
  process.exit(1);
}
