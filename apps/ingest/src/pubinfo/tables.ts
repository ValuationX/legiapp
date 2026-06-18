// PUBINFO tables we ingest, with columns in the exact .dat field order (from the
// official load DDL). `table` is the destination raw-staging table; `columns` are
// its column names in order so `COPY <table> (cols...) FROM STDIN` aligns 1:1.

export interface PubinfoTable {
  /** .dat filename inside the archive (matched case-insensitively). */
  dat: string;
  /** Fully-qualified staging table. */
  table: string;
  /** Column names in .dat field order. */
  columns: string[];
}

export const PUBINFO_TABLES: PubinfoTable[] = [
  {
    dat: 'LEGISLATOR_TBL.dat',
    table: 'raw.legislator_tbl',
    columns: [
      'district', 'session_year', 'legislator_name', 'house_type', 'author_name',
      'first_name', 'last_name', 'middle_initial', 'name_suffix', 'name_title',
      'web_name_title', 'party', 'active_flg', 'trans_uid', 'trans_update', 'active_legislator',
    ],
  },
  {
    dat: 'BILL_TBL.dat',
    table: 'raw.bill_tbl',
    columns: [
      'bill_id', 'session_year', 'session_num', 'measure_type', 'measure_num', 'measure_state',
      'chapter_year', 'chapter_type', 'chapter_session_num', 'chapter_num', 'latest_bill_version_id',
      'active_flg', 'trans_uid', 'trans_update', 'current_location', 'current_secondary_loc',
      'current_house', 'current_status', 'days_31st_in_print',
    ],
  },
  {
    dat: 'BILL_VERSION_TBL.dat',
    table: 'raw.bill_version_tbl',
    columns: [
      'bill_version_id', 'bill_id', 'version_num', 'bill_version_action_date', 'bill_version_action',
      'request_num', 'subject', 'vote_required', 'appropriation', 'fiscal_committee', 'local_program',
      'substantive_changes', 'urgency', 'taxlevy', 'bill_xml_file', 'active_flg', 'trans_uid', 'trans_update',
    ],
  },
  {
    dat: 'BILL_VERSION_AUTHORS_TBL.dat',
    table: 'raw.bill_version_authors_tbl',
    columns: [
      'bill_version_id', 'type', 'house', 'name', 'contribution', 'committee_members',
      'active_flg', 'trans_uid', 'trans_update', 'primary_author_flg',
    ],
  },
  {
    dat: 'BILL_HISTORY_TBL.dat',
    table: 'raw.bill_history_tbl',
    columns: [
      'bill_id', 'bill_history_id', 'action_date', 'action', 'trans_uid', 'trans_update_dt',
      'action_sequence', 'action_code', 'action_status', 'primary_location', 'secondary_location',
      'ternary_location', 'end_status',
    ],
  },
  {
    dat: 'BILL_SUMMARY_VOTE_TBL.dat',
    table: 'raw.bill_summary_vote_tbl',
    columns: [
      'bill_id', 'location_code', 'vote_date_time', 'vote_date_seq', 'motion_id', 'ayes', 'noes',
      'abstain', 'vote_result', 'trans_uid', 'trans_update', 'file_item_num', 'file_location',
      'display_lines', 'session_date',
    ],
  },
  {
    dat: 'BILL_DETAIL_VOTE_TBL.dat',
    table: 'raw.bill_detail_vote_tbl',
    columns: [
      'bill_id', 'location_code', 'legislator_name', 'vote_date_time', 'vote_date_seq', 'vote_code',
      'motion_id', 'trans_uid', 'trans_update', 'member_order', 'session_date', 'speaker',
    ],
  },
  {
    dat: 'BILL_MOTION_TBL.dat',
    table: 'raw.bill_motion_tbl',
    columns: ['motion_id', 'motion_text', 'trans_uid', 'trans_update'],
  },
  {
    dat: 'COMMITTEE_HEARING_TBL.dat',
    table: 'raw.committee_hearing_tbl',
    columns: [
      'bill_id', 'committee_type', 'committee_nr', 'hearing_date', 'location_code',
      'trans_uid', 'trans_update_date',
    ],
  },
  {
    dat: 'LOCATION_CODE_TBL.dat',
    table: 'raw.location_code_tbl',
    columns: [
      'session_year', 'location_code', 'location_type', 'consent_calendar_code', 'description',
      'long_description', 'active_flg', 'trans_uid', 'trans_update', 'inactive_file_flg',
    ],
  },
  {
    dat: 'CODES_TBL.dat',
    table: 'raw.codes_tbl',
    columns: ['code', 'title'],
  },
];
