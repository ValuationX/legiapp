import { getState, type StateCode, type StateConfig } from '@legiapp/shared';
import { connectClient } from '../db.js';
import {
  CALENDAR,
  ELECTION_EVENTS,
  FALLBACK_DEADLINES,
  SENATE_DEADLINES_URL,
  SENATE_ICS_URL,
  SESSION_CALENDAR,
} from './data.js';
import { categorizeEvent, parseIcs } from './ics.js';

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

// ── California builders (live Senate ICS + curated SoS) — kept on their original
//    source/external-id scheme so re-running CA refreshes its existing rows in place.
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
function californiaElections(): Row[] {
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

// ── Generic builder for source-fed states: curated election + session/deadline
//    events transcribed from official SoS + legislature sources (see data.ts).
function curatedRows(st: StateCode): Row[] {
  return (CALENDAR[st] ?? []).map((e) => ({
    externalId: `${st}:${e.slug}`,
    date: allDay(e.date),
    type: e.type,
    title: e.title,
    detail: e.detail || null,
    deadlineFlag: e.deadline,
    sourceUrl: e.sourceUrl,
    source: `${st.toLowerCase()}-calendar`,
  }));
}

// ── Session days: merge each state's per-chamber session-day lists into one 'session'
//    event per date, labelled with the chamber(s) meeting that day (using the state's
//    display labels, e.g. "Assembly"/"House"/"Senate"). Deadline-poor states express
//    their legislative schedule this way; deadline-rich states have none here.
export function sessionDayRows(cfg: StateConfig): Row[] {
  const sc = SESSION_CALENDAR[cfg.code];
  if (!sc) return [];
  const seen = new Map<string, { lower: boolean; upper: boolean }>();
  const mark = (date: string, key: 'lower' | 'upper') => {
    const cur = seen.get(date) ?? { lower: false, upper: false };
    cur[key] = true;
    seen.set(date, cur);
  };
  for (const d of sc.lower ?? []) mark(d, 'lower');
  for (const d of sc.upper ?? []) mark(d, 'upper');
  const rows: Row[] = [];
  for (const [date, ch] of seen) {
    const label =
      ch.lower && ch.upper ? `${cfg.lowerLabel} & ${cfg.upperLabel}` : ch.lower ? cfg.lowerLabel : cfg.upperLabel;
    const sourceUrl =
      ch.lower && ch.upper ? sc.sourceUrl : ch.lower ? (sc.sourceLower ?? sc.sourceUrl) : (sc.sourceUpper ?? sc.sourceUrl);
    rows.push({
      externalId: `${cfg.code}:session:${date}`,
      date: allDay(date),
      type: 'session',
      title: `${label} in session`,
      detail: `Scheduled ${label} session day.`,
      deadlineFlag: false,
      sourceUrl,
      source: `${cfg.code.toLowerCase()}-session`,
    });
  }
  return rows;
}

export async function runCalendar(stateRaw = 'CA'): Promise<{ events: number; liveIcs: boolean }> {
  const cfg = getState(stateRaw);
  if (!cfg) throw new Error(`unknown state: ${stateRaw}`);
  const st = cfg.code;
  const client = await connectClient();
  const { rows: runRows } = await client.query<{ id: number }>(
    `INSERT INTO ingest_run (source, kind, status) VALUES ($1, 'enrich', 'running') RETURNING id`,
    [`${st.toLowerCase()}_calendar`],
  );
  const runId = runRows[0]!.id;
  try {
    let rows: Row[];
    let liveIcs = false;
    if (st === 'CA') {
      let legislative = await fetchLegislativeDeadlines();
      liveIcs = legislative.length > 0;
      if (!liveIcs) legislative = fallbackDeadlines();
      rows = [...legislative, ...californiaElections()];
    } else {
      rows = [...curatedRows(st), ...sessionDayRows(cfg)];
    }

    if (rows.length) {
      const sources = [...new Set(rows.map((r) => r.source))];
      await client.query('BEGIN');
      // Replace this state's managed calendar rows (state-scoped — never touches another state).
      await client.query(`DELETE FROM calendar_event WHERE state = $1 AND source = ANY($2)`, [st, sources]);
      for (const r of rows) {
        await client.query(
          `INSERT INTO calendar_event (state, external_id, date, type, title, detail, deadline_flag, source_url, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (state, external_id) DO UPDATE
             SET date = EXCLUDED.date, type = EXCLUDED.type, title = EXCLUDED.title,
                 detail = EXCLUDED.detail, deadline_flag = EXCLUDED.deadline_flag,
                 source_url = EXCLUDED.source_url, last_verified = now()`,
          [st, r.externalId, r.date, r.type, r.title, r.detail, r.deadlineFlag, r.sourceUrl, r.source],
        );
      }
      await client.query('COMMIT');
    }

    const stats = { events: rows.length, liveIcs };
    await client.query(`UPDATE ingest_run SET status='success', finished_at=now(), stats=$2 WHERE id=$1`, [runId, stats]);
    console.log(`  ↳ ${st} calendar: ${rows.length} events${st === 'CA' ? ` (${liveIcs ? 'live ICS' : 'curated fallback'})` : ''}`);
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
