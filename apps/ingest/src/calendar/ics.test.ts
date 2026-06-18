import { describe, expect, it } from 'vitest';
import { categorizeEvent, parseIcs, parseIcsDate, unescapeIcsText, unfoldIcs } from './ics.js';

// A faithful fragment of the real Outlook-exported Senate deadlines feed:
// folded lines, escaped commas, VALUE=DATE all-day events, parameterized SUMMARY.
const SAMPLE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'CATEGORIES:Legislative Deadline',
  'DTSTART;VALUE=DATE:20260220',
  'DTEND;VALUE=DATE:20260221',
  'SUMMARY;LANGUAGE=en-us:Last day for bills to be introduced (J.R. 61(b)(4))\\, (J.R.',
  '\t 54(a)).',
  'UID:040000008200E00074C5B7101A82E008-INTRO',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260615',
  'SUMMARY:Budget Bill must be passed by midnight (Art. IV\\, Sec. 12(c)(3)).',
  'UID:BUDGET-1',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('ICS line handling', () => {
  it('unfolds RFC 5545 continuation lines (CRLF + space/TAB)', () => {
    const lines = unfoldIcs('SUMMARY:Hello\r\n\t World\r\nUID:1');
    expect(lines).toContain('SUMMARY:Hello World');
  });

  it('unescapes TEXT values and collapses whitespace', () => {
    expect(unescapeIcsText('Art. IV\\, Sec. 8\\; done')).toBe('Art. IV, Sec. 8; done');
  });

  it('parses date-only DTSTART as UTC midnight', () => {
    expect(parseIcsDate('20260602')?.toISOString()).toBe('2026-06-02T00:00:00.000Z');
  });
});

describe('parseIcs', () => {
  const events = parseIcs(SAMPLE);

  it('extracts each VEVENT with summary + date', () => {
    expect(events).toHaveLength(2);
    expect(events[0]?.uid).toBe('040000008200E00074C5B7101A82E008-INTRO');
    expect(events[0]?.date.toISOString().slice(0, 10)).toBe('2026-02-20');
  });

  it('reassembles a folded, escaped SUMMARY into clean text', () => {
    expect(events[0]?.summary).toBe('Last day for bills to be introduced (J.R. 61(b)(4)), (J.R. 54(a)).');
  });
});

describe('categorizeEvent', () => {
  const cases: [string, string, boolean][] = [
    ['Last day for bills to be introduced (J.R. 61(b)(4)).', 'introduction', true],
    ['Budget Bill must be passed by midnight (Art. IV, Sec. 12(c)(3)).', 'budget', true],
    ['Budget must be submitted by Governor (Art. IV, Sec. 12 (a)).', 'budget', true],
    ['Last day for Governor to sign or veto bills passed by the Legislature.', 'governor', true],
    ['Last day for fiscal committees to hear and report to the Floor bills introduced in their house.', 'fiscal', true],
    ['Last day for policy committees to hear and report to fiscal committees fiscal bills introduced in their house.', 'committee', true],
    ['Last day for each house to pass bills introduced in that house in the odd-numbered year.', 'house-of-origin', true],
    ['Last day for each house to pass bills (Art. IV, Sec. 10(c)).', 'floor', true],
    ['Spring Recess begins upon adjournment (J.R. 51(b)(1)).', 'recess', false],
    // The word "Budget" must not steal this from the recess bucket.
    ['Summer Recess begins upon adjournment of session, provided Budget Bill has passed (J.R. 51(b)(2)).', 'recess', false],
    ['Memorial Day.', 'holiday', false],
    ['Presidents’ Day.', 'holiday', false], // curly apostrophe, as in the real feed
    ['Legislature reconvenes (J.R. 51(a)(4)).', 'session', false],
    ['General Election.', 'election', false],
  ];

  for (const [summary, type, deadline] of cases) {
    it(`classifies "${summary.slice(0, 40)}…" as ${type} (deadline=${deadline})`, () => {
      const r = categorizeEvent(summary);
      expect(r.type).toBe(type);
      expect(r.deadlineFlag).toBe(deadline);
    });
  }
});
