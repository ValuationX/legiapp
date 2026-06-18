// Minimal, dependency-free iCalendar (RFC 5545) reader for the California
// Legislature deadline feeds. We only need a VEVENT's SUMMARY / DTSTART / UID /
// DESCRIPTION — not the whole spec — so a focused parser avoids pulling a heavy
// ICS dependency into the ingest worker (and stays trivially unit-testable).

export interface IcsEvent {
  uid: string | null;
  summary: string;
  /** Event start as a JS Date. Date-only ("all day") events → UTC midnight. */
  date: Date;
}

/**
 * Unfold RFC 5545 folded content lines: a CRLF (or LF) followed by a single
 * space or TAB is a continuation of the previous logical line.
 */
export function unfoldIcs(raw: string): string[] {
  return raw.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

/** Unescape an ICS TEXT value (RFC 5545 §3.3.11) and collapse whitespace. */
export function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse an ICS date / date-time value into a Date. Date-only → UTC midnight. */
export function parseIcsDate(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (m[4] === undefined) return new Date(Date.UTC(y, mo, d));
  // Treat timed values as UTC for determinism; these feeds are all-day anyway.
  return new Date(Date.UTC(y, mo, d, Number(m[4]), Number(m[5]), Number(m[6])));
}

function propName(line: string): { name: string; value: string } | null {
  const i = line.indexOf(':');
  if (i < 0) return null;
  // Strip any parameters (e.g. SUMMARY;LANGUAGE=en-us) — keep the base name.
  return { name: (line.slice(0, i).split(';')[0] ?? '').toUpperCase(), value: line.slice(i + 1) };
}

/** Parse VEVENTs out of an iCalendar document. Malformed events are skipped. */
export function parseIcs(raw: string): IcsEvent[] {
  const lines = unfoldIcs(raw);
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur?.summary && cur.date) {
        events.push({ uid: cur.uid ?? null, summary: cur.summary, date: cur.date });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const prop = propName(line);
    if (!prop) continue;
    switch (prop.name) {
      case 'UID':
        cur.uid = prop.value.trim();
        break;
      case 'SUMMARY':
        cur.summary = unescapeIcsText(prop.value);
        break;
      case 'DTSTART': {
        const d = parseIcsDate(prop.value);
        if (d) cur.date = d;
        break;
      }
    }
  }
  return events;
}

export type CalendarType =
  | 'introduction'
  | 'committee'
  | 'fiscal'
  | 'floor'
  | 'house-of-origin'
  | 'governor'
  | 'budget'
  | 'recess'
  | 'holiday'
  | 'session'
  | 'election'
  | 'deadline';

/**
 * Categorize a California legislative-calendar event from its (official)
 * summary text into a type + whether it is a hard deadline. Derived entirely
 * from the source wording — no invented classification.
 */
export function categorizeEvent(summary: string): { type: CalendarType; deadlineFlag: boolean } {
  // Normalize typographic apostrophes/quotes (the Outlook feed uses curly ’) so
  // patterns like "Presidents' Day" match regardless of quote style.
  const s = summary.toLowerCase().replace(/[‘’‛`]/g, "'");
  const isHardDeadline = /\blast day\b/.test(s) || /must be (passed|submitted)/.test(s);

  let type: CalendarType;
  if (/(luther king|presidents'? day|cesar chavez|chavez day|memorial day|independence day|veterans day|labor day|columbus day|thanksgiving)/.test(s)) {
    type = 'holiday';
  } else if (/recess/.test(s)) {
    // Checked before /budget/ so "Summer Recess … provided Budget Bill has passed" stays a recess.
    type = 'recess';
  } else if (/governor to sign or veto|signed or vetoed/.test(s)) {
    type = 'governor';
  } else if (/budget/.test(s)) {
    type = 'budget';
  } else if (/general election\b|qualify .*ballot|measure to qualify/.test(s)) {
    type = 'election';
  } else if (/bills to be introduced|bill requests/.test(s)) {
    type = 'introduction';
  } else if (/policy committees|any committee to hear/.test(s)) {
    type = 'committee';
  } else if (/fiscal committees/.test(s)) {
    type = 'fiscal';
  } else if (/pass bills introduced in that house/.test(s)) {
    type = 'house-of-origin';
  } else if (/amend on the floor|floor session|pass bills/.test(s)) {
    type = 'floor';
  } else if (/committee meetings may resume/.test(s)) {
    type = 'committee';
  } else if (/reconvene|statutes take effect|sine die|convening/.test(s)) {
    type = 'session';
  } else {
    type = 'deadline';
  }

  // Recesses, holidays and procedural session markers are never "deadlines".
  const deadlineFlag = isHardDeadline && type !== 'recess' && type !== 'holiday' && type !== 'session';
  return { type, deadlineFlag };
}
