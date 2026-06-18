import { runCalendar } from './calendar/run.js';
import { runCommittees } from './committees/run.js';
import { runContacts } from './contacts/run.js';
import { runForeignAffairs } from './foreign-affairs/run.js';
import { runOpenStates } from './openstates/run.js';
import { runPubinfo } from './pubinfo/run.js';
import { runScrape } from './scrape/run.js';
import { runSubjects } from './subjects/run.js';

/**
 * Full refresh. Order matters: PUBINFO normalization TRUNCATEs the legislator
 * table (wiping enrichment), so member enrichment must run *after* it. Open States
 * enrichment is a no-op without a key; the key-free committee rosters + keyword
 * subject tags fill those gaps. The calendar ingest is independent and runs last.
 * Roster/subject/calendar steps are best-effort — a failure shouldn't abort the run.
 */
export async function runAll(): Promise<void> {
  await runPubinfo();
  await runScrape();
  await runOpenStates();
  await bestEffort('committees', runCommittees);
  await bestEffort('contacts', runContacts);
  await bestEffort('subjects', runSubjects);
  await bestEffort('foreign-affairs', runForeignAffairs);
  await bestEffort('calendar', runCalendar);
}

/** Run an enrichment step, logging (not throwing) on failure so the pipeline continues. */
async function bestEffort(name: string, step: () => Promise<unknown>): Promise<void> {
  try {
    await step();
  } catch (err) {
    console.error(`• ${name} step failed (continuing):`, (err as Error)?.message ?? err);
  }
}

export { runPubinfo, runScrape, runOpenStates, runCommittees, runContacts, runSubjects, runForeignAffairs, runCalendar };
