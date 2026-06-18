import { connectClient } from '../db.js';
import {
  ELECTION_EVENTS,
  FALLBACK_DEADLINES,
  SENATE_DEADLINES_URL,
  SENATE_ICS_URL,
} from './data.js';
import { categorizeEvent, parseIcs } from './ics.js';

// Sources this adapter fully owns — cleared at the start of each run so a refresh
// is authoritative and idempotent (mirrors the district adapter's replace model).
const MANAGED_SOURCES = ['senate-ics', 'senate-2026-calendar', 'ca-sos'];

interface Row {
  externalId: string;
  date: Date;
  type: string;
  title: string;
  detail: string | null;
  deadlineFlag: boolean;
  sourceUrl: string;
  source: string;
}

/** Pin an all-day calendar date to noon UTC so it renders on the same calendar
 * day in every US timezone (UTC midnight would shift to the prior day in PT). */
function allDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T12:00:00Z`);
}

function noonUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}

/** Fetch + parse the official Senate deadlines ICS. Returns [] if unreachable. */
async function fetchLegislativeDeadlines(): Promise<Row[]> {
  let raw: string;
  try {
    const res = await fetch(SENATE_ICS_URL);
    if (!res.ok) {
      console.warn(`  • Senate ICS fetch returned ${res.status}; using curated fallback`);
      return [];
    }
    raw = await res.text();
  } catch (err) {
    console.warn(`  • Senate ICS unreachable (${(err as Error).message}); using curated fallback`);
    return [];
  }

  return parseIcs(raw)
    // The lone election event ("General Election.") is owned by the richer SoS
    // set below — drop it here (tolerate trailing punctuation) to avoid a Nov 3 dupe.
    .filter((e) => !/^general election\.?$/i.test(e.summary.trim()))
    .map((e) => {
      const { type, deadlineFlag } = categorizeEvent(e.summary);
      return {
        externalId: `senate-ics:${e.uid ?? e.summary}`,
        date: noonUtc(e.date),
        type,
        title: e.summary,
        detail: null,
        deadlineFlag,
        sourceUrl: SENATE_DEADLINES_URL,
        source: 'senate-ics',
      };
    });
}

function fallbackDeadlines(): Row[] {
  return FALLBACK_DEADLINES.map((d) => {
    const { type, deadlineFlag } = categorizeEvent(d.title);
    return {
      externalId: `senate-2026-calendar:${d.date}`,
      date: allDay(d.date),
      type,
      title: d.title,
      detail: null,
      deadlineFlag,
      sourceUrl: SENATE_DEADLINES_URL,
      source: 'senate-2026-calendar',
    };
  });
}

function electionEvents(): Row[] {
  return ELECTION_EVENTS.map((ev) => ({
    externalId: `ca-sos:${ev.slug}`,
    date: allDay(ev.date),
    type: 'election',
    title: ev.title,
    detail: ev.detail,
    deadlineFlag: ev.deadline,
    sourceUrl: ev.sourceUrl,
    source: 'ca-sos',
  }));
}

export async function runCalendar(): Promise<{ legislative: number; elections: number; liveIcs: boolean }> {
  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ('ca_calendar', 'enrich', 'running') RETURNING id`,
  );
  const runId = runRows[0]!.id;
  try {
    let legislative = await fetchLegislativeDeadlines();
    const liveIcs = legislative.length > 0;
    if (!liveIcs) legislative = fallbackDeadlines();
    const elections = electionEvents();
    const rows = [...legislative, ...elections];

    await client.query('BEGIN');
    await client.query(`DELETE FROM calendar_event WHERE source = ANY($1)`, [MANAGED_SOURCES]);
    for (const r of rows) {
      await client.query(
        `INSERT INTO calendar_event (external_id, date, type, title, detail, deadline_flag, source_url, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (external_id) DO UPDATE
           SET date = EXCLUDED.date, type = EXCLUDED.type, title = EXCLUDED.title,
               detail = EXCLUDED.detail, deadline_flag = EXCLUDED.deadline_flag,
               source_url = EXCLUDED.source_url, last_verified = now()`,
        [r.externalId, r.date, r.type, r.title, r.detail, r.deadlineFlag, r.sourceUrl, r.source],
      );
    }
    await client.query('COMMIT');

    // liveIcs=false means the curated fallback is in use — surfaced in stats so
    // /api/meta/sources can flag that the live feed wasn't reached.
    const stats = { legislative: legislative.length, elections: elections.length, liveIcs };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [
      runId,
      stats,
    ]);
    console.log(
      `  ↳ calendar: ${legislative.length} legislative (${liveIcs ? 'live ICS' : 'curated fallback'}) + ${elections.length} election events`,
    );
    return stats;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
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
