// Authoritative source URLs + curated date sets for the calendar ingest.
//
// Legislative deadlines are normally pulled live from the Senate's official ICS
// feed (the joint Rule 61 deadlines apply to BOTH houses). FALLBACK_DEADLINES is
// a verbatim transcription of that same official feed, used only when the live
// fetch fails so the calendar still populates. Election milestones have no ICS
// feed, so they are curated from the CA Secretary of State election calendar.

export const SENATE_ICS_URL =
  'https://www.senate.ca.gov/system/files/2025-10/2026-senate-legislative-deadlines-calendar.ics';
export const SENATE_DEADLINES_URL = 'https://www.senate.ca.gov/legislative-deadlines-calendar';
export const SOS_PRIMARY_URL =
  'https://www.sos.ca.gov/elections/upcoming-elections/primary-election-june-2-2026/key-dates-and-deadlines';
export const SOS_ELECTIONS_URL = 'https://www.sos.ca.gov/elections';

export interface CuratedEvent {
  slug: string;
  date: string; // YYYY-MM-DD
  title: string;
  detail: string;
  deadline: boolean;
  sourceUrl: string;
}

// California 2026 statewide election milestones (CA Secretary of State).
// Primary: June 2, 2026 · General: November 3, 2026.
export const ELECTION_EVENTS: CuratedEvent[] = [
  {
    slug: 'primary-nomination-opens',
    date: '2026-02-09',
    title: 'Candidate nomination period opens (June Primary)',
    detail: 'Declaration of Candidacy and nomination paper filing period opens for the June 2, 2026 Statewide Direct Primary Election.',
    deadline: false,
    sourceUrl: SOS_PRIMARY_URL,
  },
  {
    slug: 'primary-filing-deadline',
    date: '2026-03-06',
    title: 'Candidate filing deadline (June Primary)',
    detail: 'Last day for candidates to file a Declaration of Candidacy and nomination papers for the June 2, 2026 Primary.',
    deadline: true,
    sourceUrl: SOS_PRIMARY_URL,
  },
  {
    slug: 'primary-vbm-start',
    date: '2026-05-04',
    title: 'Vote-by-mail ballots begin mailing (June Primary)',
    detail: 'County elections officials begin mailing vote-by-mail ballots for the June 2, 2026 Primary.',
    deadline: false,
    sourceUrl: SOS_PRIMARY_URL,
  },
  {
    slug: 'primary-voter-reg-deadline',
    date: '2026-05-18',
    title: 'Voter registration deadline (June Primary)',
    detail: 'Last day to register to vote for the June 2, 2026 Primary. Conditional same-day registration is available afterward.',
    deadline: true,
    sourceUrl: SOS_PRIMARY_URL,
  },
  {
    slug: 'primary-election',
    date: '2026-06-02',
    title: 'Statewide Direct Primary Election',
    detail: 'California Statewide Direct Primary Election. Polls open 7:00 a.m. to 8:00 p.m.',
    deadline: false,
    sourceUrl: SOS_PRIMARY_URL,
  },
  {
    slug: 'general-voter-reg-deadline',
    date: '2026-10-19',
    title: 'Voter registration deadline (Nov General)',
    detail: 'Last day to register to vote for the November 3, 2026 General Election. Conditional same-day registration is available afterward.',
    deadline: true,
    sourceUrl: SOS_ELECTIONS_URL,
  },
  {
    slug: 'general-election',
    date: '2026-11-03',
    title: 'Statewide General Election',
    detail: 'California Statewide General Election. Polls open 7:00 a.m. to 8:00 p.m.',
    deadline: false,
    sourceUrl: SOS_ELECTIONS_URL,
  },
];

// Verbatim transcription of the official 2026 Senate Legislative Deadlines feed
// (titles match the source so categorizeEvent() classifies them identically to
// the live ICS path). Used only when the live fetch is unavailable.
export const FALLBACK_DEADLINES: { date: string; title: string }[] = [
  { date: '2026-01-05', title: 'Legislature reconvenes (J.R. 51(a)(4)).' },
  { date: '2026-01-10', title: 'Budget must be submitted by Governor (Art. IV, Sec. 12 (a)).' },
  { date: '2026-01-23', title: 'Last day for any committee to hear and report to the Floor bills introduced in that house in the odd-numbered year (J.R. 61(b)(2)).' },
  { date: '2026-01-31', title: 'Last day for each house to pass bills introduced in that house in the odd-numbered year (Art. IV, Sec. 10(c)), (J.R. 61(b)(3)).' },
  { date: '2026-02-20', title: 'Last day for bills to be introduced (J.R. 61(b)(4)), (J.R. 54(a)).' },
  { date: '2026-03-26', title: 'Spring Recess begins upon adjournment (J.R. 51(b)(1)).' },
  { date: '2026-04-06', title: 'Legislature reconvenes from Spring Recess (J.R. 51(b)(1)).' },
  { date: '2026-04-24', title: 'Last day for policy committees to hear and report to fiscal committees fiscal bills introduced in their house (J.R. 61(b)(5)).' },
  { date: '2026-05-01', title: 'Last day for policy committees to hear and report to the Floor non-fiscal bills introduced in their house (J.R. 61(b)(6)).' },
  { date: '2026-05-15', title: 'Last day for fiscal committees to hear and report to the Floor bills introduced in their house (J.R. 61 (b)(8)).' },
  { date: '2026-05-29', title: 'Last day for each house to pass bills introduced in that house (J.R. 61(b)(11)).' },
  { date: '2026-06-15', title: 'Budget Bill must be passed by midnight (Art. IV, Sec. 12(c)(3)).' },
  { date: '2026-07-02', title: 'Summer Recess begins upon adjournment of session, provided Budget Bill has passed (J.R. 51(b)(2)).' },
  { date: '2026-08-03', title: 'Legislature reconvenes from Summer Recess (J.R. 51(b)(2)).' },
  { date: '2026-08-21', title: 'Last day to amend on the Floor (J.R. 61(b)(16)).' },
  { date: '2026-08-31', title: 'Last day for each house to pass bills (Art. IV, Sec. 10(c)), (J.R. 61(b)(17)).' },
  { date: '2026-09-30', title: 'Last day for Governor to sign or veto bills passed by the Legislature before Sept. 1 and in the Governor’s possession on or after Sept. 1 (Art. IV, Sec. 10(b)(2)).' },
  { date: '2026-11-30', title: 'Adjournment sine die at midnight (Art. IV, Sec. 3(a)).' },
];
