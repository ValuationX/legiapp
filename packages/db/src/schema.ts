// LegiApp database schema (Drizzle / PostgreSQL).
//
//  • `raw`    — staging tables mirroring CA PUBINFO .dat files (all text). Loaded
//               verbatim via COPY for auditability, then normalized with SQL.
//  • `public` — the normalized, source-agnostic internal model. Every primary
//               record carries provenance (source / last_verified / conflict) so
//               later multi-source reconciliation can flag disagreements.
//
// PUBINFO column orders below match the official load DDL (pubinfo_load.zip) exactly.

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const chamberEnum = pgEnum('chamber', ['assembly', 'senate']);
export const voteOptionEnum = pgEnum('vote_option', ['yea', 'nay', 'abstain', 'absent', 'other']);
export const sponsorTypeEnum = pgEnum('sponsor_type', ['primary', 'co']);
export const committeeRoleEnum = pgEnum('committee_role', ['chair', 'vice_chair', 'member']);
export const stanceEnum = pgEnum('stance', ['support', 'oppose', 'mixed', 'neutral', 'unknown']);

// Reusable provenance columns (the spec's accuracy contract).
const provenance = () => ({
  source: text('source').notNull(),
  lastVerified: timestamp('last_verified', { withTimezone: true }).notNull().defaultNow(),
  conflict: boolean('conflict').notNull().default(false),
  conflictDetails: jsonb('conflict_details'),
});

// ─────────────────────────────────────────────────────────────────────────────
// RAW staging schema — mirrors PUBINFO .dat files (every column text, .dat order)
// ─────────────────────────────────────────────────────────────────────────────
export const raw = pgSchema('raw');

export const rawLegislator = raw.table('legislator_tbl', {
  district: text('district'),
  sessionYear: text('session_year'),
  legislatorName: text('legislator_name'),
  houseType: text('house_type'),
  authorName: text('author_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  middleInitial: text('middle_initial'),
  nameSuffix: text('name_suffix'),
  nameTitle: text('name_title'),
  webNameTitle: text('web_name_title'),
  party: text('party'),
  activeFlg: text('active_flg'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  activeLegislator: text('active_legislator'),
});

export const rawBill = raw.table('bill_tbl', {
  billId: text('bill_id'),
  sessionYear: text('session_year'),
  sessionNum: text('session_num'),
  measureType: text('measure_type'),
  measureNum: text('measure_num'),
  measureState: text('measure_state'),
  chapterYear: text('chapter_year'),
  chapterType: text('chapter_type'),
  chapterSessionNum: text('chapter_session_num'),
  chapterNum: text('chapter_num'),
  latestBillVersionId: text('latest_bill_version_id'),
  activeFlg: text('active_flg'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  currentLocation: text('current_location'),
  currentSecondaryLoc: text('current_secondary_loc'),
  currentHouse: text('current_house'),
  currentStatus: text('current_status'),
  days31stInPrint: text('days_31st_in_print'),
});

export const rawBillVersion = raw.table('bill_version_tbl', {
  billVersionId: text('bill_version_id'),
  billId: text('bill_id'),
  versionNum: text('version_num'),
  billVersionActionDate: text('bill_version_action_date'),
  billVersionAction: text('bill_version_action'),
  requestNum: text('request_num'),
  subject: text('subject'),
  voteRequired: text('vote_required'),
  appropriation: text('appropriation'),
  fiscalCommittee: text('fiscal_committee'),
  localProgram: text('local_program'),
  substantiveChanges: text('substantive_changes'),
  urgency: text('urgency'),
  taxlevy: text('taxlevy'),
  billXmlFile: text('bill_xml_file'), // the @var1 LOB filename column in the .dat
  activeFlg: text('active_flg'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
});

export const rawBillVersionAuthors = raw.table('bill_version_authors_tbl', {
  billVersionId: text('bill_version_id'),
  type: text('type'),
  house: text('house'),
  name: text('name'),
  contribution: text('contribution'),
  committeeMembers: text('committee_members'),
  activeFlg: text('active_flg'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  primaryAuthorFlg: text('primary_author_flg'),
});

export const rawBillHistory = raw.table('bill_history_tbl', {
  billId: text('bill_id'),
  billHistoryId: text('bill_history_id'),
  actionDate: text('action_date'),
  action: text('action'),
  transUid: text('trans_uid'),
  transUpdateDt: text('trans_update_dt'),
  actionSequence: text('action_sequence'),
  actionCode: text('action_code'),
  actionStatus: text('action_status'),
  primaryLocation: text('primary_location'),
  secondaryLocation: text('secondary_location'),
  ternaryLocation: text('ternary_location'),
  endStatus: text('end_status'),
});

export const rawBillSummaryVote = raw.table('bill_summary_vote_tbl', {
  billId: text('bill_id'),
  locationCode: text('location_code'),
  voteDateTime: text('vote_date_time'),
  voteDateSeq: text('vote_date_seq'),
  motionId: text('motion_id'),
  ayes: text('ayes'),
  noes: text('noes'),
  abstain: text('abstain'),
  voteResult: text('vote_result'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  fileItemNum: text('file_item_num'),
  fileLocation: text('file_location'),
  displayLines: text('display_lines'),
  sessionDate: text('session_date'),
});

export const rawBillDetailVote = raw.table('bill_detail_vote_tbl', {
  billId: text('bill_id'),
  locationCode: text('location_code'),
  legislatorName: text('legislator_name'),
  voteDateTime: text('vote_date_time'),
  voteDateSeq: text('vote_date_seq'),
  voteCode: text('vote_code'),
  motionId: text('motion_id'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  memberOrder: text('member_order'),
  sessionDate: text('session_date'),
  speaker: text('speaker'),
});

export const rawBillMotion = raw.table('bill_motion_tbl', {
  motionId: text('motion_id'),
  motionText: text('motion_text'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
});

export const rawCommitteeHearing = raw.table('committee_hearing_tbl', {
  billId: text('bill_id'),
  committeeType: text('committee_type'),
  committeeNr: text('committee_nr'),
  hearingDate: text('hearing_date'),
  locationCode: text('location_code'),
  transUid: text('trans_uid'),
  transUpdateDate: text('trans_update_date'),
});

export const rawLocationCode = raw.table('location_code_tbl', {
  sessionYear: text('session_year'),
  locationCode: text('location_code'),
  locationType: text('location_type'),
  consentCalendarCode: text('consent_calendar_code'),
  description: text('description'),
  longDescription: text('long_description'),
  activeFlg: text('active_flg'),
  transUid: text('trans_uid'),
  transUpdate: text('trans_update'),
  inactiveFileFlg: text('inactive_file_flg'),
});

export const rawCodes = raw.table('codes_tbl', {
  code: text('code'),
  title: text('title'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Ingestion provenance / run log
// ─────────────────────────────────────────────────────────────────────────────
export const ingestRun = pgTable('ingest_run', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('running'), // running | success | error
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  stats: jsonb('stats'),
  error: text('error'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Core normalized model
// ─────────────────────────────────────────────────────────────────────────────
export const legislator = pgTable(
  'legislator',
  {
    id: text('id').primaryKey(), // CA: `${state}:${sessionYear}:${chamber}:${district}`; source-fed: `${state}:person:${sourcePersonId}`
    state: text('state').notNull(), // 2-letter USPS code, e.g. 'CA', 'NY'
    sessionYear: text('session_year').notNull(),
    chamber: chamberEnum('chamber').notNull(),
    district: integer('district'), // numeric district (nullable — MA uses named districts → district_label)
    districtLabel: text('district_label'), // display label, e.g. "5" or "3rd Middlesex"
    sourcePersonId: text('source_person_id'), // Open States / LegiScan stable person id (source-fed states)
    fullName: text('full_name').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    pubinfoName: text('pubinfo_name'), // LEGISLATOR_NAME — the vote-record join key
    party: text('party'),
    photoUrl: text('photo_url'),
    email: text('email'),
    phone: text('phone'),
    office: text('office'),
    website: text('website'),
    seniority: text('seniority'),
    termStart: date('term_start'),
    termEnd: date('term_end'),
    nextElectionYear: integer('next_election_year'), // computed from chamber + Senate district parity
    active: boolean('active').notNull().default(true),
    ...provenance(),
  },
  (t) => ({
    // CA/PUBINFO rows (no source person id) are unique by state+session+chamber+district.
    naturalKey: uniqueIndex('legislator_natural_key')
      .on(t.state, t.sessionYear, t.chamber, t.district)
      .where(sql`source_person_id IS NULL`),
    // Source-fed rows (Open States/LegiScan) are unique by their stable person id —
    // this is what lets AZ multi-member districts and MA named districts coexist.
    sourceKey: uniqueIndex('legislator_source_key')
      .on(t.state, t.sessionYear, t.sourcePersonId)
      .where(sql`source_person_id IS NOT NULL`),
    byState: index('legislator_state_chamber_idx').on(t.state, t.chamber),
    byLastName: index('legislator_last_name_idx').on(t.lastName),
    byPubinfoName: index('legislator_pubinfo_name_idx').on(t.pubinfoName),
  }),
);

export const leadershipRole = pgTable(
  'leadership_role',
  {
    id: serial('id').primaryKey(),
    legislatorId: text('legislator_id').references(() => legislator.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    chamber: chamberEnum('chamber'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    ...provenance(),
  },
  (t) => ({ byLegislator: index('leadership_legislator_idx').on(t.legislatorId) }),
);

export const committee = pgTable(
  'committee',
  {
    id: text('id').primaryKey(), // `${state}:${locationCode|slug}`
    state: text('state').notNull(),
    name: text('name').notNull(),
    chamber: chamberEnum('chamber'),
    type: text('type'), // standing | floor | select | joint | budget_sub | other
    locationCode: text('location_code'),
    ...provenance(),
  },
  (t) => ({
    byLocationCode: index('committee_location_code_idx').on(t.locationCode),
    byState: index('committee_state_chamber_idx').on(t.state, t.chamber),
  }),
);

export const committeeMembership = pgTable(
  'committee_membership',
  {
    id: serial('id').primaryKey(),
    committeeId: text('committee_id')
      .notNull()
      .references(() => committee.id, { onDelete: 'cascade' }),
    legislatorId: text('legislator_id').references(() => legislator.id, { onDelete: 'cascade' }),
    role: committeeRoleEnum('role').notNull().default('member'),
    ...provenance(),
  },
  (t) => ({
    uniqueMember: uniqueIndex('committee_membership_unique').on(t.committeeId, t.legislatorId),
    byLegislator: index('committee_membership_legislator_idx').on(t.legislatorId),
  }),
);

export const bill = pgTable(
  'bill',
  {
    id: text('id').primaryKey(), // `${state}:${nativeBillId}`, e.g. "CA:202520260AB1"
    state: text('state').notNull(),
    sessionYear: text('session_year').notNull(),
    session: text('session').notNull(), // display, e.g. "2025-2026"
    measureType: text('measure_type').notNull(), // AB, SB, ACR, SCR, ...
    measureNum: integer('measure_num').notNull(),
    identifier: text('identifier').notNull(), // "AB 1"
    chamberOfOrigin: chamberEnum('chamber_of_origin'),
    title: text('title'),
    summary: text('summary'), // Legislative Counsel's Digest (concise plain-language summary)
    digest: text('digest'), // same as summary; kept explicit for clarity
    fullText: text('full_text'), // full bill body text (search only)
    // search_tsv (weighted tsvector) + its GIN index are added by a hand-authored
    // SQL migration — drizzle-kit doesn't emit GENERATED tsvector columns cleanly.
    status: text('status'), // human-readable, mapped
    statusCode: text('status_code'), // raw CURRENT_STATUS / MEASURE_STATE
    currentLocation: text('current_location'), // resolved location name
    currentLocationCode: text('current_location_code'),
    currentHouse: text('current_house'),
    latestVersionId: text('latest_version_id'),
    urgency: boolean('urgency'),
    appropriation: boolean('appropriation'),
    fiscalCommittee: boolean('fiscal_committee'),
    introducedDate: date('introduced_date'),
    lastActionDate: timestamp('last_action_date', { withTimezone: true }),
    lastActionDescription: text('last_action_description'),
    ...provenance(),
  },
  (t) => ({
    byState: index('bill_state_session_idx').on(t.state, t.sessionYear),
    byMeasureType: index('bill_measure_type_idx').on(t.measureType),
    byStatus: index('bill_status_idx').on(t.status),
    byOrigin: index('bill_origin_idx').on(t.chamberOfOrigin),
    byLastAction: index('bill_last_action_idx').on(t.lastActionDate),
    byIdentifier: index('bill_identifier_idx').on(t.identifier),
    // /api/committees/:id/bills filters on current_location_code; index it so that
    // lookup is not a seq scan over the whole bill table.
    byLocationCode: index('bill_current_location_code_idx').on(t.currentLocationCode),
  }),
);

export const billAction = pgTable(
  'bill_action',
  {
    id: text('id').primaryKey(), // BILL_HISTORY_ID
    billId: text('bill_id')
      .notNull()
      .references(() => bill.id, { onDelete: 'cascade' }),
    actionDate: timestamp('action_date', { withTimezone: true }),
    description: text('description'),
    actionSequence: integer('action_sequence'),
    actionCode: text('action_code'),
    chamber: chamberEnum('chamber'),
    primaryLocation: text('primary_location'),
    ...provenance(),
  },
  (t) => ({
    byBill: index('bill_action_bill_idx').on(t.billId),
    byDate: index('bill_action_date_idx').on(t.actionDate),
  }),
);

export const billSubject = pgTable(
  'bill_subject',
  {
    id: serial('id').primaryKey(),
    billId: text('bill_id')
      .notNull()
      .references(() => bill.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    source: text('source').notNull(),
  },
  (t) => ({
    byBill: index('bill_subject_bill_idx').on(t.billId),
    bySubject: index('bill_subject_subject_idx').on(t.subject),
  }),
);

export const sponsorship = pgTable(
  'sponsorship',
  {
    id: serial('id').primaryKey(),
    billId: text('bill_id')
      .notNull()
      .references(() => bill.id, { onDelete: 'cascade' }),
    legislatorId: text('legislator_id').references(() => legislator.id, { onDelete: 'set null' }),
    legislatorName: text('legislator_name').notNull(),
    type: sponsorTypeEnum('type').notNull(),
    house: text('house'),
    ...provenance(),
  },
  (t) => ({
    byBill: index('sponsorship_bill_idx').on(t.billId),
    byLegislator: index('sponsorship_legislator_idx').on(t.legislatorId),
    // Composite for the foreign-affairs leaderboard, which joins on legislator_id and
    // filters bill_id IN (…FA bills…) — lets that run as an index-only scan.
    byLegislatorBill: index('sponsorship_legislator_bill_idx').on(t.legislatorId, t.billId),
    uniqueRow: uniqueIndex('sponsorship_unique').on(t.billId, t.legislatorName, t.type),
  }),
);

export const voteEvent = pgTable(
  'vote_event',
  {
    id: text('id').primaryKey(), // `${state}:` + synthetic from bill/location/datetime/seq/motion
    state: text('state').notNull(),
    billId: text('bill_id')
      .notNull()
      .references(() => bill.id, { onDelete: 'cascade' }),
    date: timestamp('date', { withTimezone: true }),
    chamber: chamberEnum('chamber'),
    locationCode: text('location_code'),
    locationName: text('location_name'),
    committeeId: text('committee_id').references(() => committee.id, { onDelete: 'set null' }),
    isFloor: boolean('is_floor').notNull().default(false),
    motionId: text('motion_id'),
    motion: text('motion'),
    result: text('result'),
    ayes: integer('ayes'),
    noes: integer('noes'),
    abstain: integer('abstain'),
    ...provenance(),
  },
  (t) => ({
    byBill: index('vote_event_bill_idx').on(t.billId),
    byDate: index('vote_event_date_idx').on(t.date),
    byCommittee: index('vote_event_committee_idx').on(t.committeeId),
  }),
);

export const voteRecord = pgTable(
  'vote_record',
  {
    id: serial('id').primaryKey(),
    voteEventId: text('vote_event_id')
      .notNull()
      .references(() => voteEvent.id, { onDelete: 'cascade' }),
    legislatorId: text('legislator_id').references(() => legislator.id, { onDelete: 'set null' }),
    legislatorName: text('legislator_name').notNull(),
    option: voteOptionEnum('option').notNull(),
    memberOrder: integer('member_order'),
  },
  (t) => ({
    uniqueRow: uniqueIndex('vote_record_unique').on(t.voteEventId, t.legislatorName),
    byEvent: index('vote_record_event_idx').on(t.voteEventId),
    byLegislator: index('vote_record_legislator_idx').on(t.legislatorId),
  }),
);

export const committeeHearing = pgTable(
  'committee_hearing',
  {
    id: text('id').primaryKey(), // synthetic from bill/location/date
    billId: text('bill_id').references(() => bill.id, { onDelete: 'cascade' }),
    committeeId: text('committee_id').references(() => committee.id, { onDelete: 'set null' }),
    locationCode: text('location_code'),
    committeeType: text('committee_type'),
    committeeNr: text('committee_nr'),
    hearingDate: timestamp('hearing_date', { withTimezone: true }),
    ...provenance(),
  },
  (t) => ({
    byDate: index('committee_hearing_date_idx').on(t.hearingDate),
    byBill: index('committee_hearing_bill_idx').on(t.billId),
    byCommittee: index('committee_hearing_committee_idx').on(t.committeeId),
  }),
);

// Advocacy position tracking — a member's stance on an issue/topic (e.g. "Ukraine").
// No FK to legislator (ids are stable across refreshes) so curated positions
// survive a PUBINFO re-normalize, like `district`.
export const memberPosition = pgTable(
  'member_position',
  {
    id: serial('id').primaryKey(),
    state: text('state').notNull(),
    legislatorId: text('legislator_id'),
    topic: text('topic').notNull(),
    stance: stanceEnum('stance').notNull().default('unknown'),
    note: text('note'),
    billId: text('bill_id'),
    sourceUrl: text('source_url'),
    ...provenance(),
  },
  (t) => ({
    byLegislator: index('member_position_legislator_idx').on(t.legislatorId),
    byTopic: index('member_position_topic_idx').on(t.topic),
    uniqueRow: uniqueIndex('member_position_unique').on(t.legislatorId, t.topic),
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Later-phase tables — defined now so the architecture is settled; populated in
// their respective roadmap phases (reconciliation / calendar / maps / alerts).
// ─────────────────────────────────────────────────────────────────────────────
export const district = pgTable('district', {
  id: text('id').primaryKey(), // `${state}-${chamber}-${number|label}-${boundarySet}`
  state: text('state').notNull(),
  chamber: chamberEnum('chamber').notNull(),
  number: integer('number'), // nullable — MA uses named districts → district_label
  districtLabel: text('district_label'),
  boundarySet: text('boundary_set').notNull().default('current'),
  // GeoJSON for now; swap to PostGIS geometry in the maps phase.
  geojson: jsonb('geojson'),
  // No FK to legislator on purpose: a hard FK would make the normalize TRUNCATE
  // CASCADE wipe districts on every refresh. normalize re-links this instead.
  currentLegislatorId: text('current_legislator_id'),
  ...provenance(),
});

export const statement = pgTable('statement', {
  id: serial('id').primaryKey(),
  state: text('state').notNull(),
  legislatorId: text('legislator_id').references(() => legislator.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }),
  type: text('type'),
  sourceUrl: text('source_url'),
  text: text('text'),
  topics: jsonb('topics'),
  ...provenance(),
});

export const calendarEvent = pgTable(
  'calendar_event',
  {
    id: serial('id').primaryKey(),
    state: text('state').notNull(),
    // Stable key for idempotent upserts: ICS UID or a curated slug.
    externalId: text('external_id'),
    date: timestamp('date', { withTimezone: true }).notNull(),
    // election | introduction | committee | fiscal | floor | house-of-origin |
    // governor | budget | recess | holiday | session | deadline
    type: text('type'),
    title: text('title').notNull(),
    detail: text('detail'), // description / statutory citation / what it means
    sourceUrl: text('source_url'), // link to the authoritative source
    committeeId: text('committee_id').references(() => committee.id),
    deadlineFlag: boolean('deadline_flag').notNull().default(false),
    ...provenance(),
  },
  (t) => ({
    byExternalId: uniqueIndex('calendar_event_external_id_unique').on(t.state, t.externalId),
    byDate: index('calendar_event_date_idx').on(t.date),
    byType: index('calendar_event_type_idx').on(t.type),
  }),
);

export const appUser = pgTable('app_user', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // bcrypt
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const watchlist = pgTable(
  'watchlist',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // bill | legislator | committee
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueFollow: uniqueIndex('watchlist_unique').on(t.userId, t.targetType, t.targetId),
    byUser: index('watchlist_user_idx').on(t.userId),
  }),
);

// Persisted list-page filters (e.g. "AB bills in Health, in committee").
export const savedFilter = pgTable(
  'saved_filter',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    entity: text('entity').notNull(), // bill | legislator
    query: text('query').notNull(), // a query string, e.g. "subject=Health&status=..."
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byUser: index('saved_filter_user_idx').on(t.userId) }),
);

export const alert = pgTable(
  'alert',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => appUser.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    channel: text('channel').notNull().default('email'), // email | sms (future)
    trigger: text('trigger').notNull(), // bill_advanced | vote_scheduled | deadline_approaching
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueAlert: uniqueIndex('alert_unique').on(t.userId, t.targetType, t.targetId, t.trigger),
    byUser: index('alert_user_idx').on(t.userId),
  }),
);
