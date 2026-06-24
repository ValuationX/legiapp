// Canonical bill-status buckets. Raw bill.status strings vary wildly across sources
// (CA PUBINFO sends free text like "Chaptered", "Vetoed", "In Assembly", "Two Year
// Bill", "Failed To Pass"; OpenStates bills are often null). We bucket them into a
// small, friendly set for filtering + display instead of dumping 20+ raw strings.

export const BILL_STATUS_BUCKETS = [
  'introduced',
  'in_committee',
  'passed_chamber',
  'signed',
  'vetoed',
  'failed',
  'other',
] as const;
export type BillStatusBucket = (typeof BILL_STATUS_BUCKETS)[number];

export const BILL_STATUS_BUCKET_LABELS: Record<BillStatusBucket, string> = {
  introduced: 'Introduced',
  in_committee: 'In committee',
  passed_chamber: 'Passed chamber',
  signed: 'Signed into law',
  vetoed: 'Vetoed',
  failed: 'Failed / Died',
  other: 'Other',
};

/**
 * Map a raw status string to a canonical bucket. Order matters: terminal/dead states
 * are tested before "passed" so "Failed To Pass" → failed (not passed_chamber), and
 * "Chaptered" → signed (not passed_chamber).
 */
export function billStatusBucket(status: string | null | undefined): BillStatusBucket {
  const s = (status ?? '').toLowerCase().trim();
  if (!s) return 'other';
  if (/chaptered|approved by the governor|signed by the governor|enacted|filed with secretary of state/.test(s))
    return 'signed';
  if (/vetoed/.test(s)) return 'vetoed';
  if (/failed|died|withdrawn|stricken|not adopted/.test(s)) return 'failed';
  // Stalled-but-not-formally-dead — keep out of the "failed" red bucket.
  if (/two year bill|inactive file/.test(s)) return 'other';
  if (/passed|engrossed|enrolled|read third time|\badopted\b/.test(s)) return 'passed_chamber';
  if (/committee|referred to com|re-referred|hearing/.test(s)) return 'in_committee';
  if (/in assembly|in senate|introduc|read first time|read second time|from printer|to print/.test(s))
    return 'introduced';
  return 'other';
}
