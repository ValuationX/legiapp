// Authoritative source URLs + curated date sets for the calendar ingest.
//
// Legislative deadlines are normally pulled live from the Senate's official ICS
// feed (the joint Rule 61 deadlines apply to BOTH houses). FALLBACK_DEADLINES is
// a verbatim transcription of that same official feed, used only when the live
// fetch fails so the calendar still populates. Election milestones have no ICS
// feed, so they are curated from the CA Secretary of State election calendar.

import type { StateCode } from '@legiapp/shared';

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

// ── Source-fed states: curated 2026 election + legislative-session milestones,
//    transcribed from official Secretary-of-State / Board-of-Elections + legislature
//    sources (researched 2026-06-22). `type` is election | session | deadline.
export interface StateCalEvent {
  slug: string; // unique within the state
  date: string; // YYYY-MM-DD
  type: string;
  title: string;
  detail: string;
  deadline: boolean;
  sourceUrl: string;
}

export const CALENDAR: Partial<Record<StateCode, StateCalEvent[]>> = {
  NY: [
    { slug: 'session-convene', date: '2026-01-07', type: 'session', title: '2026 Legislative Session convenes', detail: 'The New York State Legislature convenes its 2026 regular session.', deadline: false, sourceUrl: 'https://www.nysenate.gov/sites/default/files/pdfs/2026-legislative-session-calendar.pdf' },
    { slug: 'exec-budget-deadline', date: '2026-01-20', type: 'deadline', title: 'Final day for Executive Budget submission', detail: "Final day for submission of the Governor's Executive Budget for the 2026 session.", deadline: true, sourceUrl: 'https://www.nysenate.gov/sites/default/files/pdfs/2026-legislative-session-calendar.pdf' },
    { slug: 'fiscal-year-begins', date: '2026-04-01', type: 'session', title: 'New fiscal year begins (budget deadline)', detail: "Start of New York State's new fiscal year — the budget deadline for the 2026 session.", deadline: false, sourceUrl: 'https://www.nysenate.gov/sites/default/files/pdfs/2026-legislative-session-calendar.pdf' },
    { slug: 'designating-petition-deadline', date: '2026-04-06', type: 'deadline', title: 'Designating petition filing deadline', detail: 'Last day to file designating petitions for the 2026 primary (filing period March 30 – April 6).', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-06-13', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Last day a registration application must be received to be eligible to vote in the 2026 primary.', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'primary-election', date: '2026-06-23', type: 'election', title: '2026 Primary Election', detail: 'New York statewide primary election for the 2026 cycle.', deadline: false, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'general-registration-deadline', date: '2026-10-24', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Last day a registration application must be received to be eligible to vote in the 2026 general election.', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'New York general election — all Assembly and Senate seats.', deadline: false, sourceUrl: 'https://elections.ny.gov/' },
  ],
  OH: [
    { slug: 'candidate-filing-deadline', date: '2026-02-04', type: 'deadline', title: 'Candidate filing deadline (partisan)', detail: 'Declarations of candidacy for partisan candidates for the May 5, 2026 primary must be filed by 4 p.m.', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'primary-registration-deadline', date: '2026-04-06', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Deadline to register to vote for the May 5, 2026 primary (30 days before).', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'primary-election', date: '2026-05-05', type: 'election', title: '2026 Primary Election', detail: 'Ohio statewide primary election; polls open 6:30 a.m.–7:30 p.m.', deadline: false, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'general-registration-deadline', date: '2026-10-05', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Deadline to register to vote for the November 3, 2026 general election (30 days before).', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Ohio general election; polls open 6:30 a.m.–7:30 p.m.', deadline: false, sourceUrl: 'https://www.ohiosos.gov/elections/' },
  ],
  MI: [
    { slug: 'session-convene', date: '2026-01-14', type: 'session', title: '2026 Regular Session convenes', detail: 'Both chambers of the Michigan Legislature reconvene for the 2026 regular session.', deadline: false, sourceUrl: 'https://senate.michigan.gov/information/calendars-schedules/session-schedule/' },
    { slug: 'candidate-filing-deadline', date: '2026-04-21', type: 'deadline', title: 'Candidate filing deadline', detail: 'Nominating petitions/fee and Affidavits of Identity due by 4 p.m. for the August primary.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'primary-registration-deadline', date: '2026-07-20', type: 'deadline', title: 'Voter registration deadline (primary, mail/online)', detail: 'Deadline to register by mail or online for the August election; in-person registration available afterward.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'primary-election', date: '2026-08-04', type: 'election', title: '2026 Primary Election', detail: 'Michigan statewide August primary election.', deadline: false, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter registration deadline (general, mail/online)', detail: 'Deadline to register by mail or online for the November election; in-person registration available afterward.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Michigan statewide general election.', deadline: false, sourceUrl: 'https://www.michigan.gov/sos' },
  ],
  HI: [
    { slug: 'session-convene', date: '2026-01-21', type: 'session', title: '2026 Regular Session convenes', detail: 'The Hawaii State Legislature convenes its 2026 regular session (third Wednesday of January).', deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/' },
    { slug: 'candidate-filing-opens', date: '2026-02-02', type: 'deadline', title: 'Candidate filing begins', detail: 'Candidate filing for the 2026 elections opens February 2, 2026.', deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'candidate-filing-deadline', date: '2026-06-02', type: 'deadline', title: 'Candidate filing deadline', detail: 'Deadline to file as a candidate for the 2026 elections (4:30 p.m.).', deadline: true, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-07-29', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Paper-application registration deadline for the 2026 Primary; online/same-day available afterward.', deadline: true, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'primary-election', date: '2026-08-08', type: 'election', title: '2026 Primary Election', detail: "Hawaii's 2026 primary election.", deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: "Hawaii's 2026 general election.", deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
  ],
  IA: [
    { slug: 'session-convene', date: '2026-01-12', type: 'session', title: '2026 Legislative Session convenes', detail: 'First day of the 2026 session (second regular session of the 91st General Assembly).', deadline: false, sourceUrl: 'https://www.legis.iowa.gov/' },
    { slug: 'candidate-filing-deadline', date: '2026-03-13', type: 'deadline', title: 'Primary candidate filing deadline', detail: 'Final day for state and federal candidates to file nomination papers (period Feb 23 – Mar 13).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'session-100th-day', date: '2026-04-21', type: 'session', title: '100th calendar day of session', detail: "100th calendar day of the 2026 session, when legislators' per-diem expenses end.", deadline: false, sourceUrl: 'https://www.legis.iowa.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-05-18', type: 'deadline', title: 'Voter pre-registration deadline (primary)', detail: 'Last day to pre-register to vote for the June 2, 2026 primary (5 p.m.).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'primary-election', date: '2026-06-02', type: 'election', title: '2026 Primary Election', detail: "Iowa's statewide primary election.", deadline: false, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter pre-registration deadline (general)', detail: 'Last day to pre-register to vote for the November 3, 2026 general election (5 p.m.).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: "Iowa's general election.", deadline: false, sourceUrl: 'https://sos.iowa.gov/' },
  ],
  PA: [
    { slug: 'candidate-filing-deadline', date: '2026-03-10', type: 'deadline', title: 'Nomination petition filing deadline', detail: 'Last day for candidates to circulate and file nomination petitions for the 2026 primary.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'primary-registration-deadline', date: '2026-05-04', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Last day to register to vote in the 2026 general primary.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'primary-election', date: '2026-05-19', type: 'election', title: '2026 General Primary', detail: 'Pennsylvania statewide primary election.', deadline: false, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Last day to register to vote in the November 2026 general election.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Pennsylvania statewide general election.', deadline: false, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
  ],
  MA: [
    { slug: 'party-enrollment-deadline', date: '2026-02-24', type: 'deadline', title: 'Party enrollment change deadline', detail: 'Last day to enroll in/un-enroll from a party to run as a party candidate for state/district office in 2026.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'nomination-papers-registrars', date: '2026-04-28', type: 'deadline', title: 'Nomination papers due to registrars', detail: 'Deadline (5 p.m.) to submit nomination papers to local registrars for certification (state/district office).', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'nomination-papers-filing', date: '2026-05-26', type: 'deadline', title: 'Certified nomination papers filing deadline', detail: "Deadline (5 p.m.) to file certified nomination papers with the Secretary of the Commonwealth.", deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'primary-registration-deadline', date: '2026-08-22', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Deadline to register to vote in the September 1, 2026 state primary.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'state-primary', date: '2026-09-01', type: 'election', title: 'State Primary', detail: 'Massachusetts 2026 state primary election.', deadline: false, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'general-registration-deadline', date: '2026-10-24', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Deadline to register to vote in the November 3, 2026 state election.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: 'State General Election', detail: 'Massachusetts 2026 general election.', deadline: false, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
  ],
};
