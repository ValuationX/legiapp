// Curated from the user-maintained "California Positions Guide" (last updated 2026-06-17).
// Leadership is keyed by DISTRICT (stable even when members change). Update when
// leadership changes (~once per session). Source of truth is the chambers' official
// leadership pages.

export interface LeadershipEntry {
  chamber: 'assembly' | 'senate';
  district: number;
  role: string;
}

export const LEADERSHIP: LeadershipEntry[] = [
  // ── Senate ──
  { chamber: 'senate', district: 21, role: 'President pro Tempore' },
  { chamber: 'senate', district: 8, role: 'Majority Leader' },
  { chamber: 'senate', district: 8, role: 'Majority Floor Leader' },
  { chamber: 'senate', district: 10, role: 'Assistant Majority Leader' },
  { chamber: 'senate', district: 35, role: 'Assistant Majority Leader' },
  { chamber: 'senate', district: 20, role: 'Majority Caucus Chair' },
  { chamber: 'senate', district: 9, role: 'Majority Whip' },
  { chamber: 'senate', district: 15, role: 'Assistant Majority Whip' },
  { chamber: 'senate', district: 18, role: 'Assistant Majority Whip' },
  { chamber: 'senate', district: 22, role: 'Assistant Majority Whip' },
  { chamber: 'senate', district: 40, role: 'Minority Leader' },
  { chamber: 'senate', district: 32, role: 'Minority Caucus Chair' },
  { chamber: 'senate', district: 23, role: 'Minority Whip' },
  // ── Assembly ──
  { chamber: 'assembly', district: 29, role: 'Speaker' },
  { chamber: 'assembly', district: 69, role: 'Speaker pro Tempore' },
  { chamber: 'assembly', district: 4, role: 'Majority Floor Leader' },
  { chamber: 'assembly', district: 54, role: 'Majority Whip' },
  { chamber: 'assembly', district: 50, role: 'Assistant Majority Leader' },
  { chamber: 'assembly', district: 9, role: 'Minority Leader' },
  { chamber: 'assembly', district: 71, role: 'Minority Floor Leader' },
  { chamber: 'assembly', district: 33, role: 'Minority Whip' },
  { chamber: 'assembly', district: 1, role: 'Assistant Minority Leader' },
];

// Issue-position seeds (the guide's "Support for Ukraine" tracker). Seed ONLY what
// is recorded — never invent a stance. The team fills this in over time.
export interface PositionEntry {
  chamber: 'assembly' | 'senate';
  district: number;
  topic: string;
  stance: 'support' | 'oppose' | 'mixed' | 'neutral' | 'unknown';
  note?: string;
  billIdentifier?: string;
}

export const POSITIONS: PositionEntry[] = [
  { chamber: 'senate', district: 15, topic: 'Ukraine', stance: 'support', billIdentifier: 'SB 1328', note: 'Linked to SB 1328 in the positions guide.' },
];
