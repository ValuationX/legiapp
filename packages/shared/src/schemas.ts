import { z } from 'zod';
import { BILL_STATUS_BUCKETS } from './billStatus.js';

// ─────────────────────────────────────────────────────────────────────────────
// Primitives / enums
// ─────────────────────────────────────────────────────────────────────────────
export const Chamber = z.enum(['assembly', 'senate']);
export type Chamber = z.infer<typeof Chamber>;

export const VoteOption = z.enum(['yea', 'nay', 'abstain', 'absent', 'other']);
export type VoteOption = z.infer<typeof VoteOption>;

export const SponsorType = z.enum(['primary', 'co']);
export type SponsorType = z.infer<typeof SponsorType>;

export const CommitteeRole = z.enum(['chair', 'vice_chair', 'member']);
export type CommitteeRole = z.infer<typeof CommitteeRole>;

/** A member's stance on a topic — mirrors the Postgres `stance` enum. */
export const Stance = z.enum(['support', 'oppose', 'mixed', 'neutral', 'unknown']);
export type Stance = z.infer<typeof Stance>;

/** Provenance carried on user-facing records (the accuracy contract). */
export const Provenance = z.object({
  source: z.string(),
  lastVerified: z.string().nullable(), // ISO timestamp
  conflict: z.boolean().default(false),
});
export type Provenance = z.infer<typeof Provenance>;

// ─────────────────────────────────────────────────────────────────────────────
// Legislators
// ─────────────────────────────────────────────────────────────────────────────
export const LeadershipRole = z.object({
  role: z.string(),
  chamber: Chamber.nullable(),
});
export type LeadershipRole = z.infer<typeof LeadershipRole>;

export const LegislatorSummary = Provenance.extend({
  id: z.string(),
  fullName: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  party: z.string().nullable(),
  chamber: Chamber,
  // Nullable for named-district states (e.g. MA), which carry the label instead.
  district: z.number().int().nullable(),
  districtLabel: z.string().nullable().optional(),
  photoUrl: z.string().nullable(),
  nextElectionYear: z.number().int().nullable(),
  inOffice: z.boolean().default(true), // member of the current session
  leadershipRoles: z.array(LeadershipRole).default([]),
});
export type LegislatorSummary = z.infer<typeof LegislatorSummary>;

export const MemberPosition = z.object({
  topic: z.string(),
  stance: Stance,
  note: z.string().nullable(),
  billId: z.string().nullable(),
  billIdentifier: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
export type MemberPosition = z.infer<typeof MemberPosition>;

export const CommitteeAssignment = z.object({
  committeeId: z.string(),
  committeeName: z.string(),
  role: CommitteeRole,
});
export type CommitteeAssignment = z.infer<typeof CommitteeAssignment>;

export const LegislatorDetail = LegislatorSummary.extend({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  office: z.string().nullable(),
  website: z.string().nullable(),
  seniority: z.string().nullable(),
  termStart: z.string().nullable(),
  termEnd: z.string().nullable(),
  committees: z.array(CommitteeAssignment).default([]),
  positions: z.array(MemberPosition).default([]),
  sponsoredCount: z.number().int().default(0),
  // The same person's CURRENT active record id (===id when this record is current;
  // null when they no longer serve). Lets the UI link a stale term to the live profile.
  currentId: z.string().nullable().default(null),
});
export type LegislatorDetail = z.infer<typeof LegislatorDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// Bills
// ─────────────────────────────────────────────────────────────────────────────
export const BillSummary = Provenance.extend({
  id: z.string(),
  identifier: z.string(),
  measureType: z.string(),
  measureNum: z.number().int(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  chamberOfOrigin: Chamber.nullable(),
  currentLocation: z.string().nullable(),
  lastActionDate: z.string().nullable(),
  lastActionDescription: z.string().nullable(),
  // Highlighted full-text-search fragment (only present on search results).
  matchSnippet: z.string().nullable().optional(),
});
export type BillSummary = z.infer<typeof BillSummary>;

export const BillAction = z.object({
  id: z.string(),
  date: z.string().nullable(),
  description: z.string().nullable(),
  chamber: Chamber.nullable(),
});
export type BillAction = z.infer<typeof BillAction>;

export const BillSponsor = z.object({
  legislatorId: z.string().nullable(),
  legislatorName: z.string(),
  type: SponsorType,
  party: z.string().nullable(),
  chamber: Chamber.nullable(),
});
export type BillSponsor = z.infer<typeof BillSponsor>;

export const VoteTally = z.object({
  ayes: z.number().int().nullable(),
  noes: z.number().int().nullable(),
  abstain: z.number().int().nullable(),
});
export type VoteTally = z.infer<typeof VoteTally>;

export const BillVoteEventSummary = VoteTally.extend({
  id: z.string(),
  date: z.string().nullable(),
  chamber: Chamber.nullable(),
  locationName: z.string().nullable(),
  committeeId: z.string().nullable(),
  isFloor: z.boolean(),
  motion: z.string().nullable(),
  result: z.string().nullable(),
});
export type BillVoteEventSummary = z.infer<typeof BillVoteEventSummary>;

export const BillDetail = BillSummary.extend({
  summary: z.string().nullable(),
  session: z.string(),
  introducedDate: z.string().nullable(),
  subjects: z.array(z.string()).default([]),
  actions: z.array(BillAction).default([]),
  sponsors: z.array(BillSponsor).default([]),
  votes: z.array(BillVoteEventSummary).default([]),
});
export type BillDetail = z.infer<typeof BillDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// Votes
// ─────────────────────────────────────────────────────────────────────────────
export const VoteRecord = z.object({
  legislatorId: z.string().nullable(),
  legislatorName: z.string(),
  party: z.string().nullable(),
  option: VoteOption,
});
export type VoteRecord = z.infer<typeof VoteRecord>;

export const VoteEventDetail = BillVoteEventSummary.extend({
  billId: z.string(),
  billIdentifier: z.string(),
  billTitle: z.string().nullable(),
  records: z.array(VoteRecord).default([]),
});
export type VoteEventDetail = z.infer<typeof VoteEventDetail>;

/** A vote as shown on a legislator profile (how *they* voted). */
export const LegislatorVote = z.object({
  voteEventId: z.string(),
  billId: z.string(),
  billIdentifier: z.string(),
  billTitle: z.string().nullable(),
  date: z.string().nullable(),
  option: VoteOption,
  result: z.string().nullable(),
  motion: z.string().nullable(),
  isFloor: z.boolean(),
});
export type LegislatorVote = z.infer<typeof LegislatorVote>;

// ─────────────────────────────────────────────────────────────────────────────
// Committees
// ─────────────────────────────────────────────────────────────────────────────
export const CommitteeSummary = Provenance.extend({
  id: z.string(),
  name: z.string(),
  chamber: Chamber.nullable(),
  type: z.string().nullable(),
  memberCount: z.number().int().default(0),
});
export type CommitteeSummary = z.infer<typeof CommitteeSummary>;

export const CommitteeMember = z.object({
  legislatorId: z.string().nullable(),
  fullName: z.string(),
  party: z.string().nullable(),
  chamber: Chamber.nullable(),
  district: z.number().int().nullable(),
  role: CommitteeRole,
});
export type CommitteeMember = z.infer<typeof CommitteeMember>;

export const CommitteeDetail = CommitteeSummary.extend({
  members: z.array(CommitteeMember).default([]),
  recentHearings: z
    .array(
      z.object({
        billId: z.string().nullable(),
        billIdentifier: z.string().nullable(),
        date: z.string().nullable(),
      }),
    )
    .default([]),
});
export type CommitteeDetail = z.infer<typeof CommitteeDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// Calendar & deadlines
// ─────────────────────────────────────────────────────────────────────────────
export const CalendarEvent = Provenance.extend({
  id: z.number().int(),
  date: z.string(), // ISO timestamp (all-day events pinned to noon UTC)
  type: z.string().nullable(),
  title: z.string(),
  detail: z.string().nullable(),
  deadlineFlag: z.boolean(),
  sourceUrl: z.string().nullable(),
  committeeId: z.string().nullable(),
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

// `deadline`/`upcoming` are string flags ("true"/"1") — avoids z.coerce.boolean's
// footgun where any non-empty string (incl. "false") becomes true.
const flagParam = z
  .union([z.literal('true'), z.literal('1'), z.literal('false'), z.literal('0')])
  .optional()
  .transform((v) => v === 'true' || v === '1');

// YYYY-MM-DD (optionally with a time suffix) — malformed input becomes a 400
// ZodError instead of reaching Postgres as a failed timestamptz cast (500).
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}([T ]|$)/, 'expected an ISO date (YYYY-MM-DD)')
  .optional();

export const CalendarQuery = z.object({
  state: z.string().optional(),
  type: z.string().optional(),
  deadline: flagParam,
  upcoming: flagParam,
  from: dateParam, // inclusive lower bound
  to: dateParam, // inclusive upper bound
  limit: z.coerce.number().int().min(1).max(500).default(300),
});
export type CalendarQuery = z.infer<typeof CalendarQuery>;

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard / search / meta
// ─────────────────────────────────────────────────────────────────────────────
export const UpcomingHearing = z.object({
  id: z.string(),
  date: z.string().nullable(),
  committeeId: z.string().nullable(),
  committeeName: z.string().nullable(),
  billId: z.string().nullable(),
  billIdentifier: z.string().nullable(),
  billTitle: z.string().nullable(),
});
export type UpcomingHearing = z.infer<typeof UpcomingHearing>;

export const DashboardThisWeek = z.object({
  recentlyMovedBills: z.array(BillSummary),
  upcomingHearings: z.array(UpcomingHearing),
  upcomingDeadlines: z.array(CalendarEvent).default([]),
  dataFreshness: z.array(
    z.object({ source: z.string().nullable(), lastVerified: z.string().nullable(), records: z.number().int() }),
  ),
  counts: z.object({ committees: z.number().int(), legislators: z.number().int() }).default({ committees: 0, legislators: 0 }),
});
export type DashboardThisWeek = z.infer<typeof DashboardThisWeek>;

export const SearchResults = z.object({
  legislators: z.array(LegislatorSummary),
  bills: z.array(BillSummary),
  committees: z.array(CommitteeSummary),
});
export type SearchResults = z.infer<typeof SearchResults>;

export const SourceStatus = z.object({
  source: z.string(),
  kind: z.string(),
  status: z.string(),
  lastVerified: z.string().nullable(),
  stats: z.record(z.unknown()).nullable(),
});
export type SourceStatus = z.infer<typeof SourceStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination + query params
// ─────────────────────────────────────────────────────────────────────────────
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const pageParams = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(300).default(25),
};

export const LegislatorQuery = z.object({
  ...pageParams,
  state: z.string().optional(),
  chamber: Chamber.optional(),
  party: z.string().optional(),
  district: z.coerce.number().int().optional(),
  reelectionYear: z.coerce.number().int().optional(),
  positionTopic: z.string().optional(),
  positionStance: Stance.optional(),
  // Session filter: omitted = current roster only; "all" = every session; or an 8-digit session_year.
  session: z.string().optional(),
  q: z.string().optional(),
});
export type LegislatorQuery = z.infer<typeof LegislatorQuery>;

export const BillQuery = z.object({
  ...pageParams,
  state: z.string().optional(),
  chamber: Chamber.optional(),
  measureType: z.string().optional(),
  status: z.string().optional(),
  // Friendly status bucket (Introduced / In committee / …) — the API expands it to the
  // matching raw status strings for the active state. Coexists with the raw `status`.
  canonicalStatus: z.enum(BILL_STATUS_BUCKETS).optional(),
  subject: z.string().optional(),
  sponsor: z.string().optional(),
  // Session filter: omitted = current session only; "all" = every session; or an 8-digit session_year.
  session: z.string().optional(),
  // Active-only (recent action, not dead/vetoed) — defaults ON; pass active=false to include the rest.
  active: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  q: z.string().optional(),
});
export type BillQuery = z.infer<typeof BillQuery>;

export const CommitteeQuery = z.object({
  state: z.string().optional(),
  chamber: Chamber.optional(),
  q: z.string().optional(),
});
export type CommitteeQuery = z.infer<typeof CommitteeQuery>;

export const SearchQuery = z.object({
  state: z.string().optional(),
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
export type SearchQuery = z.infer<typeof SearchQuery>;

// ─────────────────────────────────────────────────────────────────────────────
// Foreign Affairs / Ukraine tracker
// ─────────────────────────────────────────────────────────────────────────────
export const FaSponsor = z.object({
  legislatorId: z.string().nullable(),
  name: z.string(),
  party: z.string().nullable(),
  chamber: Chamber.nullable(),
  type: SponsorType, // primary (author) | co (coauthor)
  currentlyInOffice: z.boolean(), // a same-name member sits in the current session
});
export type FaSponsor = z.infer<typeof FaSponsor>;

export const ForeignAffairsBill = z.object({
  id: z.string(),
  identifier: z.string(),
  measureType: z.string(),
  session: z.string(), // e.g. "2021-2022"
  title: z.string().nullable(),
  status: z.string().nullable(),
  chamberOfOrigin: Chamber.nullable(),
  introducedDate: z.string().nullable(),
  lastActionDate: z.string().nullable(),
  regions: z.array(z.string()), // region keys, e.g. ["ukraine","russia"]
  signed: z.boolean(), // chaptered / approved by the Governor (or adopted, for resolutions)
  digestSnippet: z.string().nullable(),
  authors: z.array(FaSponsor),
  coauthors: z.array(FaSponsor),
  ayes: z.number().int().nullable(),
  noes: z.number().int().nullable(),
});
export type ForeignAffairsBill = z.infer<typeof ForeignAffairsBill>;

/** A legislator ranked by foreign-affairs (or single-region) authorship/coauthorship,
 * aggregated across sessions (so a multi-session ally counts once). */
export const FaLeader = z.object({
  legislatorId: z.string(),
  name: z.string(),
  party: z.string().nullable(),
  chamber: Chamber.nullable(),
  inOffice: z.boolean(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  authored: z.number().int(),
  coauthored: z.number().int(),
  passed: z.number().int(), // their measures that were chaptered/signed
  total: z.number().int(),
  score: z.number().int(),
  level: z.enum(['champion', 'strong-ally', 'ally', 'supporter']),
});
export type FaLeader = z.infer<typeof FaLeader>;

export const ForeignAffairsResponse = z.object({
  regions: z.array(z.object({ key: z.string(), label: z.string(), count: z.number().int(), adjacent: z.boolean() })),
  bills: z.array(ForeignAffairsBill),
  leaders: z.array(FaLeader),
});
export type ForeignAffairsResponse = z.infer<typeof ForeignAffairsResponse>;

export const ForeignAffairsQuery = z.object({
  state: z.string().optional(),
  region: z.string().optional(), // filter to one region key (e.g. "ukraine")
});
export type ForeignAffairsQuery = z.infer<typeof ForeignAffairsQuery>;

// ─────────────────────────────────────────────────────────────────────────────
// Personalization: auth · watchlist · saved filters · alerts
// ─────────────────────────────────────────────────────────────────────────────
export const WatchTargetType = z.enum(['bill', 'legislator', 'committee']);
export type WatchTargetType = z.infer<typeof WatchTargetType>;

export const AlertTrigger = z.enum(['bill_advanced', 'vote_scheduled', 'deadline_approaching']);
export type AlertTrigger = z.infer<typeof AlertTrigger>;

export const Credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});
export type Credentials = z.infer<typeof Credentials>;

export const AuthUser = z.object({
  id: z.number().int(),
  email: z.string(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const WatchInput = z.object({
  targetType: WatchTargetType,
  targetId: z.string().min(1),
});
export type WatchInput = z.infer<typeof WatchInput>;

/** A followed item, enriched with a display label + link for the watchlist page. */
export const WatchItem = z.object({
  id: z.number().int(),
  targetType: WatchTargetType,
  targetId: z.string(),
  label: z.string(), // e.g. "AB 1" or "Buffy Wicks"
  sublabel: z.string().nullable(), // title / party-chamber / committee chamber
  status: z.string().nullable(), // bill status, when applicable
  createdAt: z.string(),
});
export type WatchItem = z.infer<typeof WatchItem>;

export const SavedFilterInput = z.object({
  name: z.string().min(1).max(120),
  entity: z.enum(['bill', 'legislator']),
  query: z.string().max(500),
});
export type SavedFilterInput = z.infer<typeof SavedFilterInput>;

export const SavedFilter = SavedFilterInput.extend({
  id: z.number().int(),
  createdAt: z.string(),
});
export type SavedFilter = z.infer<typeof SavedFilter>;

export const AlertInput = z.object({
  targetType: WatchTargetType,
  targetId: z.string().min(1),
  trigger: AlertTrigger,
  channel: z.enum(['email']).default('email'),
});
export type AlertInput = z.infer<typeof AlertInput>;

export const Alert = z.object({
  id: z.number().int(),
  targetType: WatchTargetType,
  targetId: z.string(),
  trigger: AlertTrigger,
  channel: z.string(),
  label: z.string(),
  lastTriggeredAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof Alert>;
