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

// ── Source-fed states: curated 2026 legislative-session calendar (convene, recesses,
//    bill/committee deadlines, budget & adjournment) + statewide election milestones,
//    transcribed verbatim from official legislature + Secretary-of-State sources
//    (researched 2026-06-23). Every event carries its official `sourceUrl`. No state
//    publishes an .ics feed, so these are curated-from-official (point-in-time) and
//    refresh per session. `type` ∈ session | recess | deadline | introduction |
//    committee | fiscal | floor | budget | governor | election.
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
    // Session structure (NY Assembly/Senate 2026 session calendar).
    { slug: 'session-convene', date: '2026-01-07', type: 'session', title: '2026 Legislative Session convenes', detail: 'The New York State Legislature convenes its 2026 regular session.', deadline: false, sourceUrl: 'https://assembly.state.ny.us/leg/calendar/' },
    { slug: 'exec-budget-deadline', date: '2026-01-20', type: 'budget', title: 'Final day for Executive Budget submission', detail: "Final day for submission of the Governor's Executive Budget for the 2026 session.", deadline: true, sourceUrl: 'https://www.nysenate.gov/sites/default/files/pdfs/2026-legislative-session-calendar.pdf' },
    { slug: 'fiscal-year-begins', date: '2026-04-01', type: 'budget', title: 'State budget deadline (new fiscal year begins)', detail: "Start of New York State's new fiscal year — the on-time budget deadline for the 2026 session.", deadline: true, sourceUrl: 'https://www.nysenate.gov/sites/default/files/pdfs/2026-legislative-session-calendar.pdf' },
    { slug: 'session-end', date: '2026-06-04', type: 'session', title: 'Last scheduled session day', detail: 'Final scheduled session day on the 2026 Assembly legislative calendar.', deadline: false, sourceUrl: 'https://assembly.state.ny.us/leg/calendar/' },
    // Elections (NY State Board of Elections).
    { slug: 'designating-petition-deadline', date: '2026-04-06', type: 'deadline', title: 'Designating petition filing deadline', detail: 'Last day to file designating petitions for the 2026 primary (filing period March 30 – April 6).', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-06-13', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Last day a registration application must be received to be eligible to vote in the 2026 primary.', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'primary-election', date: '2026-06-23', type: 'election', title: '2026 Primary Election', detail: 'New York statewide primary election for the 2026 cycle.', deadline: false, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'general-registration-deadline', date: '2026-10-24', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Last day a registration application must be received to be eligible to vote in the 2026 general election.', deadline: true, sourceUrl: 'https://elections.ny.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'New York general election — all Assembly and Senate seats.', deadline: false, sourceUrl: 'https://elections.ny.gov/' },
  ],
  OH: [
    // Ohio publishes no firm bill deadlines (2026 is an even, non-budget year); the
    // legislative schedule is its session days (see SESSION_CALENDAR). Statewide elections:
    { slug: 'candidate-filing-deadline', date: '2026-02-04', type: 'deadline', title: 'Candidate filing deadline (partisan)', detail: 'Declarations of candidacy for partisan candidates for the May 5, 2026 primary must be filed by 4 p.m.', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'primary-registration-deadline', date: '2026-04-06', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Deadline to register to vote for the May 5, 2026 primary (30 days before).', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'primary-election', date: '2026-05-05', type: 'election', title: '2026 Primary Election', detail: 'Ohio statewide primary election; polls open 6:30 a.m.–7:30 p.m.', deadline: false, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'general-registration-deadline', date: '2026-10-05', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Deadline to register to vote for the November 3, 2026 general election (30 days before).', deadline: true, sourceUrl: 'https://www.ohiosos.gov/elections/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Ohio general election; polls open 6:30 a.m.–7:30 p.m.', deadline: false, sourceUrl: 'https://www.ohiosos.gov/elections/' },
  ],
  MI: [
    { slug: 'session-convene', date: '2026-01-14', type: 'session', title: '2026 Regular Session convenes', detail: 'Both chambers of the Michigan Legislature reconvene for the 2026 regular session (Senate convenes at noon Jan 14).', deadline: false, sourceUrl: 'https://senate.michigan.gov/information/calendars-schedules/session-schedule/' },
    { slug: 'budget-target', date: '2026-07-01', type: 'budget', title: 'Budget target date (FY2027)', detail: 'Customary/statutory target to complete the state budget; the Senate Fiscal Agency notes budget action typically ends by early July.', deadline: false, sourceUrl: 'https://sfa.senate.michigan.gov/BudgetProcess/BudgetTimeFrameOverview.pdf' },
    { slug: 'fiscal-year-end', date: '2026-09-30', type: 'fiscal', title: 'State fiscal year ends', detail: 'FY2026 ends September 30; FY2027 begins October 1 (statutory fiscal-year boundary).', deadline: false, sourceUrl: 'https://sfa.senate.michigan.gov/BudgetProcess/BudgetTimeFrameOverview.pdf' },
    { slug: 'session-end', date: '2026-12-17', type: 'session', title: 'Last scheduled session day', detail: 'Final scheduled Senate session day of 2026; the Legislature adjourns sine die at year-end.', deadline: false, sourceUrl: 'https://senate.michigan.gov/information/calendars-schedules/session-schedule/' },
    // Elections (Michigan Secretary of State).
    { slug: 'candidate-filing-deadline', date: '2026-04-21', type: 'deadline', title: 'Candidate filing deadline', detail: 'Nominating petitions/fee and Affidavits of Identity due by 4 p.m. for the August primary.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'primary-registration-deadline', date: '2026-07-20', type: 'deadline', title: 'Voter registration deadline (primary, mail/online)', detail: 'Deadline to register by mail or online for the August election; in-person registration available afterward.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'primary-election', date: '2026-08-04', type: 'election', title: '2026 Primary Election', detail: 'Michigan statewide August primary election.', deadline: false, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter registration deadline (general, mail/online)', detail: 'Deadline to register by mail or online for the November election; in-person registration available afterward.', deadline: true, sourceUrl: 'https://www.michigan.gov/sos' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Michigan statewide general election.', deadline: false, sourceUrl: 'https://www.michigan.gov/sos' },
  ],
  HI: [
    { slug: 'session-convene', date: '2026-01-21', type: 'session', title: 'Opening Day — 2026 Regular Session convenes', detail: 'The Hawaii State Legislature convenes its 2026 regular session at 10:00 a.m. (third Wednesday of January).', deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'package-cutoff-nonadmin', date: '2026-01-23', type: 'introduction', title: 'Non-administration bill package cutoff', detail: 'Last day to introduce all non-administration bill packages.', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'state-of-the-state', date: '2026-01-26', type: 'session', title: 'State of the State Address', detail: "The Governor's annual address to the assembled joint Legislature.", deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'bill-intro-cutoff', date: '2026-01-28', type: 'introduction', title: 'Bill Introduction Cutoff', detail: 'Last day to introduce bills (filed with the House or Senate Clerk and numbered HB/SB).', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'recess-begin', date: '2026-02-26', type: 'recess', title: 'Mandatory 5-day recess begins', detail: 'Start of the constitutionally mandated 5-day recess (between the 20th and 40th session days).', deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'recess-end', date: '2026-03-04', type: 'recess', title: 'Mandatory 5-day recess ends', detail: 'End of the constitutionally mandated 5-day recess.', deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'first-decking', date: '2026-03-06', type: 'deadline', title: 'First Decking', detail: 'Deadline for bills to emerge from all committees and be submitted to the originating chamber clerk (48-hour review before third reading).', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'first-crossover', date: '2026-03-12', type: 'floor', title: 'First Crossover', detail: 'Deadline for bills to pass third reading and cross over to the other chamber.', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'budget-decking', date: '2026-03-16', type: 'budget', title: 'Budget Decking', detail: "Deadline for decking the Governor's budget (spending plan) bills.", deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'budget-crossover', date: '2026-03-18', type: 'budget', title: 'Budget Crossover', detail: 'Last day for third reading of budget bills to move to the other chamber.', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'second-decking', date: '2026-04-10', type: 'deadline', title: 'Second Decking', detail: 'Amended bills must emerge from all committees in the non-originating chamber and be decked (48-hour review before third reading).', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'second-crossover', date: '2026-04-16', type: 'floor', title: 'Second Crossover & Disagree', detail: 'Amended bills must pass third reading to cross back; last day for the originating body to disagree with amendments (triggers conference).', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'final-decking-nonfiscal', date: '2026-04-29', type: 'deadline', title: 'Final Decking (non-fiscal bills)', detail: 'Deadline for submitting non-fiscal bills for final reading by both chambers.', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'final-decking-fiscal', date: '2026-05-01', type: 'fiscal', title: 'Final Decking (fiscal bills)', detail: 'Deadline for submitting fiscal bills (appropriations, tax credits) for final reading.', deadline: true, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'sine-die', date: '2026-05-08', type: 'session', title: 'Adjournment Sine Die', detail: '60th legislative day; the Legislature adjourns and enrolls agreed bills to the Governor.', deadline: false, sourceUrl: 'https://www.capitol.hawaii.gov/docs/SessionCalendar.pdf' },
    { slug: 'gov-intent-veto', date: '2026-06-30', type: 'governor', title: "Governor's intent-to-veto deadline", detail: '35th day after sine die; the Governor must notify the Legislature of any bill he intends to veto.', deadline: true, sourceUrl: 'https://lrb.hawaii.gov/par/wp-content/uploads/sites/2/2026/04/2026-Governor-Deadlines-A.pdf' },
    { slug: 'gov-sign-veto', date: '2026-07-15', type: 'governor', title: "Governor's sign/veto deadline (45th day)", detail: 'Final day for the Governor to sign or veto; the Legislature may convene in special session to override.', deadline: true, sourceUrl: 'https://lrb.hawaii.gov/par/wp-content/uploads/sites/2/2026/04/2026-Governor-Deadlines-A.pdf' },
    // Elections (Hawaii Office of Elections).
    { slug: 'candidate-filing-opens', date: '2026-02-02', type: 'deadline', title: 'Candidate filing begins', detail: 'Candidate filing for the 2026 elections opens February 2, 2026.', deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'candidate-filing-deadline', date: '2026-06-02', type: 'deadline', title: 'Candidate filing deadline', detail: 'Deadline to file as a candidate for the 2026 elections (4:30 p.m.).', deadline: true, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-07-29', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Paper-application registration deadline for the 2026 Primary; online/same-day available afterward.', deadline: true, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'primary-election', date: '2026-08-08', type: 'election', title: '2026 Primary Election', detail: "Hawaii's 2026 primary election.", deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: "Hawaii's 2026 general election.", deadline: false, sourceUrl: 'https://elections.hawaii.gov/' },
  ],
  IA: [
    { slug: 'session-convene', date: '2026-01-12', type: 'session', title: '2026 Legislative Session convenes', detail: 'First day of the 2026 session (second session of the 91st General Assembly); second Monday of January.', deadline: false, sourceUrl: 'https://www.legis.iowa.gov/docs/publications/SESTT/current.pdf' },
    { slug: 'bill-request-deadline', date: '2026-01-23', type: 'deadline', title: 'Individual bill draft request deadline', detail: 'Last day for individual legislator requests for bill and joint-resolution drafts to the Legislative Services Agency.', deadline: true, sourceUrl: 'https://www.legis.iowa.gov/docs/publications/SESTT/current.pdf' },
    { slug: 'first-funnel', date: '2026-02-20', type: 'deadline', title: 'First funnel — committee deadline', detail: 'Last day for bills to be reported out of committee in their originating chamber (Joint Rule 20); appropriations & ways-and-means bills exempt.', deadline: true, sourceUrl: 'https://www.legis.iowa.gov/docs/publications/SESTT/current.pdf' },
    { slug: 'second-funnel', date: '2026-03-20', type: 'deadline', title: 'Second funnel — committee deadline (opposite chamber)', detail: 'Last day for bills to be reported out of committee in the opposite chamber (Joint Rule 20).', deadline: true, sourceUrl: 'https://www.legis.iowa.gov/docs/publications/SESTT/current.pdf' },
    { slug: 'session-100th-day', date: '2026-04-21', type: 'session', title: '100th calendar day of session', detail: "100th calendar day of the 2026 session, when legislators' per-diem expenses end (the target adjournment marker).", deadline: false, sourceUrl: 'https://www.legis.iowa.gov/docs/publications/SESTT/current.pdf' },
    // Elections (Iowa Secretary of State).
    { slug: 'candidate-filing-deadline', date: '2026-03-13', type: 'deadline', title: 'Primary candidate filing deadline', detail: 'Final day for state and federal candidates to file nomination papers (period Feb 23 – Mar 13).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'primary-registration-deadline', date: '2026-05-18', type: 'deadline', title: 'Voter pre-registration deadline (primary)', detail: 'Last day to pre-register to vote for the June 2, 2026 primary (5 p.m.).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'primary-election', date: '2026-06-02', type: 'election', title: '2026 Primary Election', detail: "Iowa's statewide primary election.", deadline: false, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter pre-registration deadline (general)', detail: 'Last day to pre-register to vote for the November 3, 2026 general election (5 p.m.).', deadline: true, sourceUrl: 'https://sos.iowa.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: "Iowa's general election.", deadline: false, sourceUrl: 'https://sos.iowa.gov/' },
  ],
  PA: [
    { slug: 'gov-budget-address', date: '2026-02-03', type: 'budget', title: "Governor's 2026–27 Budget Address", detail: 'The Governor delivers the FY2026–27 budget proposal to a joint session, opening the budget process.', deadline: false, sourceUrl: 'https://www.palegis.us/senate/session' },
    { slug: 'budget-deadline', date: '2026-06-30', type: 'budget', title: 'State budget deadline (FY2026–27)', detail: 'The Pennsylvania Constitution (Art. VIII) requires a balanced state budget enacted by June 30, before the July 1 fiscal year.', deadline: true, sourceUrl: 'https://www.palegis.us/' },
    // Elections (PA Department of State).
    { slug: 'candidate-filing-deadline', date: '2026-03-10', type: 'deadline', title: 'Nomination petition filing deadline', detail: 'Last day for candidates to circulate and file nomination petitions for the 2026 primary.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'primary-registration-deadline', date: '2026-05-04', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Last day to register to vote in the 2026 general primary.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'primary-election', date: '2026-05-19', type: 'election', title: '2026 General Primary', detail: 'Pennsylvania statewide primary election.', deadline: false, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'general-registration-deadline', date: '2026-10-19', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Last day to register to vote in the November 2026 general election.', deadline: true, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Pennsylvania statewide general election.', deadline: false, sourceUrl: 'https://www.pa.gov/agencies/dos/programs/voting-and-elections.html' },
  ],
  MA: [
    { slug: 'session-convene', date: '2026-01-07', type: 'session', title: 'Second annual session convenes', detail: 'Start of the 2026 (second-year) formal sessions of the 194th General Court (first Wednesday in January).', deadline: false, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'jr10-hcf', date: '2026-01-28', type: 'committee', title: 'Joint Rule 10 deadline — Health Care Financing', detail: 'Last day for the Joint Committee on Health Care Financing to report, per Joint Rule 10 (the only JR10 reporting deadline in 2026).', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'gov-budget', date: '2026-01-28', type: 'budget', title: 'Governor submits FY2027 budget', detail: 'Statutory deadline for the Governor to file the annual budget (General Appropriation Bill) for the second year.', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'const-amend-report', date: '2026-04-29', type: 'deadline', title: 'Last day to report constitutional amendments', detail: 'Reporting deadline for proposed constitutional amendments in the second annual session.', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'initiative-petitions', date: '2026-05-05', type: 'deadline', title: 'Last day to enact initiative petitions', detail: 'Constitutional deadline for the Legislature to act on pending initiative petitions.', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'hwm-budget', date: '2026-05-13', type: 'budget', title: 'House Ways & Means reports FY2027 budget', detail: 'Deadline for House Ways & Means to report out the annual (FY2027) budget.', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'last-formal-session', date: '2026-07-31', type: 'session', title: 'Last day for formal sessions', detail: 'Per Joint Rule 12A, no formal sessions are held after July 31 of the second year — the effective end of formal lawmaking (informal sessions continue).', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'agency-filings', date: '2026-11-04', type: 'deadline', title: 'Agency filing deadline (195th General Court)', detail: '5:00 p.m. deadline for agency/early bill filings for the next (195th) General Court.', deadline: true, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    { slug: 'prorogation', date: '2027-01-05', type: 'session', title: 'Prorogation (second annual session ends)', detail: "Formal end (prorogation) of the 194th General Court's second annual session.", deadline: false, sourceUrl: 'https://malegislature.gov/ClerksOffice/Senate/Deadlines' },
    // Elections (MA Secretary of the Commonwealth).
    { slug: 'party-enrollment-deadline', date: '2026-02-24', type: 'deadline', title: 'Party enrollment change deadline', detail: 'Last day to enroll in/un-enroll from a party to run as a party candidate for state/district office in 2026.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'nomination-papers-registrars', date: '2026-04-28', type: 'deadline', title: 'Nomination papers due to registrars', detail: 'Deadline (5 p.m.) to submit nomination papers to local registrars for certification (state/district office).', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'nomination-papers-filing', date: '2026-05-26', type: 'deadline', title: 'Certified nomination papers filing deadline', detail: 'Deadline (5 p.m.) to file certified nomination papers with the Secretary of the Commonwealth.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'primary-registration-deadline', date: '2026-08-22', type: 'deadline', title: 'Voter registration deadline (primary)', detail: 'Deadline to register to vote in the September 1, 2026 state primary.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'state-primary', date: '2026-09-01', type: 'election', title: 'State Primary', detail: 'Massachusetts 2026 state primary election.', deadline: false, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'general-registration-deadline', date: '2026-10-24', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Deadline to register to vote in the November 3, 2026 state election.', deadline: true, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: 'State General Election', detail: 'Massachusetts 2026 general election.', deadline: false, sourceUrl: 'https://www.sec.state.ma.us/divisions/elections/' },
  ],
  IL: [
    { slug: 'session-convene', date: '2026-01-13', type: 'session', title: '2026 spring session reconvenes', detail: 'The Illinois General Assembly reconvenes for the 2026 spring session (Senate Jan 13; House first substantive session days Jan 20–22).', deadline: false, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'lrb-request-deadline', date: '2026-01-16', type: 'deadline', title: 'LRB bill-drafting request deadline', detail: 'Last day to submit Legislative Reference Bureau bill-drafting requests; the blackout period begins.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'bill-intro-deadline', date: '2026-02-06', type: 'introduction', title: 'Bill introduction deadline', detail: 'Last day to introduce Senate and House bills.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'gov-budget-address', date: '2026-02-18', type: 'budget', title: "Governor's Budget & State of the State Address", detail: 'The Governor delivers the combined budget and State of the State address.', deadline: false, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'sb-committee-deadline', date: '2026-03-13', type: 'committee', title: 'Senate bills out of committee deadline', detail: 'Committee deadline for substantive Senate bills in the Senate.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'hb-committee-deadline', date: '2026-03-27', type: 'committee', title: 'House bills out of committee deadline', detail: 'Committee deadline for substantive House bills in the House.', deadline: true, sourceUrl: 'https://www.ilga.gov/House/Schedules' },
    { slug: 'third-reading-own', date: '2026-04-17', type: 'floor', title: 'Third reading deadline (chamber of origin)', detail: 'Floor-passage (crossover) deadline for substantive bills in their originating chamber.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'committee-deadline-opposite', date: '2026-05-08', type: 'committee', title: 'Committee deadline (opposite chamber)', detail: 'Deadline for substantive bills to clear committee in the second chamber.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'third-reading-opposite', date: '2026-05-22', type: 'floor', title: 'Third reading deadline (opposite chamber)', detail: 'Deadline for third reading of substantive bills in the second chamber.', deadline: true, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    { slug: 'adjournment', date: '2026-05-31', type: 'session', title: 'Scheduled spring adjournment', detail: 'Scheduled adjournment of the 2026 spring session; immediate-effect bills require a supermajority after this date.', deadline: false, sourceUrl: 'https://www.ilga.gov/Senate/Schedules' },
    // Elections (Illinois State Board of Elections).
    { slug: 'primary-filing-first-day', date: '2025-10-27', type: 'deadline', title: 'First day to file nomination papers (primary)', detail: 'First day to file nomination papers for the 2026 General Primary.', deadline: true, sourceUrl: 'https://elections.il.gov/' },
    { slug: 'primary-filing-last-day', date: '2025-11-03', type: 'deadline', title: 'Last day to file nomination papers (primary)', detail: 'Last day to file nomination papers for the 2026 General Primary.', deadline: true, sourceUrl: 'https://elections.il.gov/' },
    { slug: 'primary-registration-close', date: '2026-02-17', type: 'deadline', title: 'Close of voter registration (primary)', detail: 'Last day for regular voter registration before the General Primary.', deadline: true, sourceUrl: 'https://elections.il.gov/' },
    { slug: 'primary-online-registration-close', date: '2026-03-01', type: 'deadline', title: 'Close of online voter registration (primary)', detail: 'Last day to register online before the General Primary.', deadline: true, sourceUrl: 'https://elections.il.gov/' },
    { slug: 'general-primary', date: '2026-03-17', type: 'election', title: '2026 General Primary Election', detail: 'Illinois statewide general primary election.', deadline: false, sourceUrl: 'https://elections.il.gov/' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Illinois statewide general election.', deadline: false, sourceUrl: 'https://elections.il.gov/' },
  ],
  AZ: [
    { slug: 'session-convene', date: '2026-01-12', type: 'session', title: '57th Legislature, Second Regular Session convenes', detail: 'The Arizona Legislature convenes its 2026 second regular session (second Monday of January).', deadline: false, sourceUrl: 'https://www.azsenate.gov/alispdfs/2026SessionTimeline.pdf' },
    { slug: 'senate-bill-request', date: '2026-01-20', type: 'introduction', title: 'Senate bill request deadline', detail: 'Deadline (5 p.m.) to submit Senate bill requests.', deadline: true, sourceUrl: 'https://www.azsenate.gov/alispdfs/2026SessionTimeline.pdf' },
    { slug: 'senate-bill-intro', date: '2026-02-02', type: 'introduction', title: 'Senate bill introduction deadline', detail: 'Last day for introduction of Senate bills.', deadline: true, sourceUrl: 'https://www.azsenate.gov/alispdfs/2026SessionTimeline.pdf' },
    { slug: 'house-bill-intro', date: '2026-02-09', type: 'introduction', title: 'House bill introduction deadline', detail: 'Last day for introduction of House bills (House Rule 8C).', deadline: true, sourceUrl: 'https://www.azleg.gov/alispdfs/housedeadlines.pdf' },
    { slug: 'committee-of-origin', date: '2026-02-20', type: 'committee', title: 'Committee-of-origin deadline', detail: 'Last day to hear bills in committee in their chamber of origin (Senate bills in Senate, House bills in House).', deadline: true, sourceUrl: 'https://www.azleg.gov/alispdfs/housedeadlines.pdf' },
    { slug: 'crossover-committee', date: '2026-03-27', type: 'committee', title: 'Crossover committee deadline', detail: 'Last day to hear opposite-chamber bills in committee (the crossover deadline).', deadline: true, sourceUrl: 'https://www.azleg.gov/alispdfs/housedeadlines.pdf' },
    { slug: 'conference-committees', date: '2026-04-17', type: 'committee', title: 'Conference committees deadline', detail: 'Conference committees must consider all bills before Saturday of the week of the 97th day.', deadline: true, sourceUrl: 'https://www.azleg.gov/alispdfs/housedeadlines.pdf' },
    { slug: 'session-100th-day', date: '2026-04-21', type: 'session', title: '100th day of session', detail: 'The 100th calendar day of the regular session; the basis for the sine die target.', deadline: false, sourceUrl: 'https://www.azsenate.gov/alispdfs/2026SessionTimeline.pdf' },
    { slug: 'sine-die-target', date: '2026-04-25', type: 'session', title: 'Adjournment sine die (scheduled target)', detail: 'Rule-based target adjournment — Saturday of the week of the 100th day (House Rule 2A); may be extended.', deadline: false, sourceUrl: 'https://www.azleg.gov/alispdfs/housedeadlines.pdf' },
    // Elections (Arizona Secretary of State).
    { slug: 'candidate-filing-deadline', date: '2026-03-23', type: 'deadline', title: 'Candidate filing deadline', detail: 'Deadline (5 p.m.) to file nomination papers with the Secretary of State for the 2026 election.', deadline: true, sourceUrl: 'https://azsos.gov/elections/candidates/candidate-filing' },
    { slug: 'primary-election', date: '2026-07-21', type: 'election', title: '2026 Primary Election', detail: 'Arizona statewide primary election (July 21, 2026 under HB2022).', deadline: false, sourceUrl: 'https://azsos.gov/elections/election-information/2026-election-info' },
    { slug: 'general-registration-deadline', date: '2026-10-05', type: 'deadline', title: 'Voter registration deadline (general)', detail: 'Last day to register to vote for the 2026 general election (29 days before).', deadline: true, sourceUrl: 'https://azsos.gov/elections/vote' },
    { slug: 'general-election', date: '2026-11-03', type: 'election', title: '2026 General Election', detail: 'Arizona statewide general election.', deadline: false, sourceUrl: 'https://azsos.gov/elections/election-information/2026-election-info' },
  ],
};

// ── Per-state legislative session days (when each chamber is scheduled to meet),
//    transcribed from official chamber session calendars. The calendar ingest merges
//    these per date into one 'session' event. Only states whose published schedule is
//    primarily a list of session days are listed here; the deadline-rich states (HI,
//    IL, IA, MA, AZ) express their schedule through the CALENDAR deadlines above.
export interface SessionCalendar {
  sourceUrl: string; // primary session-calendar source
  sourceLower?: string; // lower-chamber session page, if distinct
  sourceUpper?: string; // upper-chamber session page, if distinct
  lower?: string[]; // YYYY-MM-DD dates the lower house is in session
  upper?: string[]; // YYYY-MM-DD dates the upper house is in session
}

export const SESSION_CALENDAR: Partial<Record<StateCode, SessionCalendar>> = {
  NY: {
    // NY Assembly 2026 session calendar (Assembly session days).
    sourceUrl: 'https://assembly.state.ny.us/leg/calendar/',
    lower: [
      '2026-01-07', '2026-01-12', '2026-01-13', '2026-01-20', '2026-01-21', '2026-01-26', '2026-01-27', '2026-01-28',
      '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-09', '2026-02-10', '2026-02-11', '2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26',
      '2026-03-04', '2026-03-05', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-30', '2026-03-31',
      '2026-04-01', '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-27', '2026-04-28', '2026-04-29',
      '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29',
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
    ],
  },
  PA: {
    sourceUrl: 'https://www.palegis.us/',
    sourceLower: 'https://www.palegis.us/house/session',
    sourceUpper: 'https://www.palegis.us/senate/session',
    lower: [
      '2026-01-06', '2026-01-28', '2026-02-02', '2026-02-03', '2026-02-04',
      '2026-03-19', '2026-03-23', '2026-03-24', '2026-03-25',
      '2026-04-13', '2026-04-14', '2026-04-15', '2026-04-27', '2026-04-28', '2026-04-29',
      '2026-05-04', '2026-05-05', '2026-05-06',
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29', '2026-06-30',
      '2026-09-28', '2026-09-29', '2026-09-30',
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-19', '2026-10-20', '2026-10-21',
      '2026-11-09', '2026-11-10',
    ],
    upper: [
      '2026-01-06', '2026-02-02', '2026-02-03', '2026-02-04',
      '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-23', '2026-03-24', '2026-03-27',
      '2026-04-20', '2026-04-21', '2026-04-22',
      '2026-05-04', '2026-05-05', '2026-05-06',
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-29', '2026-06-30',
      '2026-09-28', '2026-09-29', '2026-09-30',
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-19', '2026-10-20', '2026-10-21',
      '2026-11-17', '2026-11-18',
    ],
  },
  MI: {
    // Michigan Senate 2026 session schedule (high-confidence official PDF). The House
    // schedule is published only as a faint scanned PDF, so it is omitted to avoid
    // transcription error; the Senate days anchor the in-session view.
    sourceUrl: 'https://senate.michigan.gov/information/calendars-schedules/session-schedule/',
    upper: [
      '2026-01-14', '2026-01-15', '2026-01-21', '2026-01-22', '2026-01-27', '2026-01-28', '2026-01-29',
      '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-18', '2026-02-19', '2026-02-24', '2026-02-25', '2026-02-26',
      '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-24', '2026-03-25', '2026-03-26',
      '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-28', '2026-04-29', '2026-04-30',
      '2026-05-06', '2026-05-07', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-19', '2026-05-20', '2026-05-21',
      '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-30',
      '2026-07-01', '2026-07-02', '2026-07-15', '2026-07-29',
      '2026-08-12', '2026-08-26',
      '2026-09-09', '2026-09-10', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-22', '2026-09-29', '2026-09-30',
      '2026-10-01', '2026-10-08', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-27', '2026-10-28', '2026-10-29',
      '2026-11-10', '2026-11-11', '2026-11-12',
      '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-15', '2026-12-16', '2026-12-17',
    ],
  },
  OH: {
    // Ohio's official page shows only the forward window (Jan–Aug 2026 have rolled off);
    // these are the remaining scheduled 2026 session days as of mid-2026.
    sourceUrl: 'https://www.legislature.ohio.gov/schedules/session-schedule',
    lower: ['2026-11-10', '2026-11-18', '2026-12-02', '2026-12-09', '2026-12-16'],
    upper: ['2026-09-16', '2026-09-23', '2026-10-07', '2026-11-10', '2026-11-18', '2026-12-02', '2026-12-09', '2026-12-16', '2026-12-17'],
  },
};
