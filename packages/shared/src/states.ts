// Per-state configuration registry — the keystone of the multi-state design.
//
// LegiApp tracks STATE legislatures only (no U.S. Congress). California is the
// authoritative PUBINFO-fed state; the others are fed by Open States + LegiScan,
// reconciled. Everything state-specific (jurisdiction names, FIPS for maps, chamber
// display labels, seat counts, map framing, source priority) lives here so the
// schema/API/UI stay generic. Consumed by ingest, the API (`/api/meta/states`),
// and the web app.
//
// Internal chamber values stay `assembly` (lower house) / `senate` (upper house)
// for ALL states; only the DISPLAY label differs (CA & NY say "Assembly", the rest
// say "House"). See `lowerLabel`/`upperLabel`.

export const STATE_CODES = ['CA', 'NY', 'PA', 'MA', 'AZ', 'MI', 'HI', 'IL', 'OH', 'IA'] as const;
export type StateCode = (typeof STATE_CODES)[number];

export type SourceName = 'pubinfo' | 'openstates' | 'legiscan';

export interface StateConfig {
  code: StateCode;
  name: string;
  fips: string; // Census FIPS — builds the TIGER SLDL/SLDU shapefile URLs
  openStatesJurisdiction: string; // Open States v3 `jurisdiction` (the STATE legislature, never US Congress)
  legiscanAbbr: string; // LegiScan state abbreviation
  lowerLabel: string; // display name for chamber='assembly' (lower house)
  upperLabel: string; // display name for chamber='senate' (upper house)
  lowerShort: string; // compact tag, e.g. "AD" (Assembly District) or "HD" (House District)
  upperShort: string; // e.g. "SD" (Senate District)
  lowerSeats: number;
  upperSeats: number;
  mapCenter: [number, number]; // [lat, lng] for the district map
  mapZoom: number;
  sourcePriority: SourceName[]; // reconcile() winner order (highest priority first)
  hasPubinfo: boolean; // true only for CA (its official bulk feed)
  // Structural quirks handled explicitly elsewhere:
  multiMember?: boolean; // AZ: each lower-house district elects 2 members
  namedDistricts?: boolean; // MA: districts are named (e.g. "3rd Middlesex"), not numbered
}

export const STATES: Record<StateCode, StateConfig> = {
  CA: {
    code: 'CA',
    name: 'California',
    fips: '06',
    openStatesJurisdiction: 'California',
    legiscanAbbr: 'CA',
    lowerLabel: 'Assembly',
    upperLabel: 'Senate',
    lowerShort: 'AD',
    upperShort: 'SD',
    lowerSeats: 80,
    upperSeats: 40,
    mapCenter: [37.3, -119.4],
    mapZoom: 6,
    sourcePriority: ['pubinfo', 'openstates'],
    hasPubinfo: true,
  },
  NY: {
    code: 'NY',
    name: 'New York',
    fips: '36',
    openStatesJurisdiction: 'New York',
    legiscanAbbr: 'NY',
    lowerLabel: 'Assembly', // NY, like CA, calls its lower house the Assembly
    upperLabel: 'Senate',
    lowerShort: 'AD',
    upperShort: 'SD',
    lowerSeats: 150,
    upperSeats: 63,
    mapCenter: [42.9, -75.5],
    mapZoom: 6,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    fips: '42',
    openStatesJurisdiction: 'Pennsylvania',
    legiscanAbbr: 'PA',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 203,
    upperSeats: 50,
    mapCenter: [40.9, -77.7],
    mapZoom: 7,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  MA: {
    code: 'MA',
    name: 'Massachusetts',
    fips: '25',
    openStatesJurisdiction: 'Massachusetts',
    legiscanAbbr: 'MA',
    lowerLabel: 'House', // the legislature is the "General Court"; the lower house is the House of Representatives
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 160,
    upperSeats: 40,
    mapCenter: [42.1, -71.8],
    mapZoom: 8,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
    namedDistricts: true, // districts are named (e.g. "3rd Middlesex"), not numeric
  },
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    fips: '04',
    openStatesJurisdiction: 'Arizona',
    legiscanAbbr: 'AZ',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 60,
    upperSeats: 30,
    mapCenter: [34.3, -111.7],
    mapZoom: 6,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
    multiMember: true, // 30 districts, each electing 2 Representatives (+1 Senator)
  },
  MI: {
    code: 'MI',
    name: 'Michigan',
    fips: '26',
    openStatesJurisdiction: 'Michigan',
    legiscanAbbr: 'MI',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 110,
    upperSeats: 38,
    mapCenter: [44.3, -85.6],
    mapZoom: 6,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  HI: {
    code: 'HI',
    name: 'Hawaii',
    fips: '15',
    openStatesJurisdiction: 'Hawaii',
    legiscanAbbr: 'HI',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 51,
    upperSeats: 25,
    mapCenter: [20.7, -156.5],
    mapZoom: 7,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  IL: {
    code: 'IL',
    name: 'Illinois',
    fips: '17',
    openStatesJurisdiction: 'Illinois',
    legiscanAbbr: 'IL',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 118,
    upperSeats: 59,
    mapCenter: [40.0, -89.2],
    mapZoom: 6,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  OH: {
    code: 'OH',
    name: 'Ohio',
    fips: '39',
    openStatesJurisdiction: 'Ohio',
    legiscanAbbr: 'OH',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 99,
    upperSeats: 33,
    mapCenter: [40.3, -82.8],
    mapZoom: 7,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
  IA: {
    code: 'IA',
    name: 'Iowa',
    fips: '19',
    openStatesJurisdiction: 'Iowa',
    legiscanAbbr: 'IA',
    lowerLabel: 'House',
    upperLabel: 'Senate',
    lowerShort: 'HD',
    upperShort: 'SD',
    lowerSeats: 100,
    upperSeats: 50,
    mapCenter: [42.0, -93.5],
    mapZoom: 7,
    sourcePriority: ['legiscan', 'openstates'],
    hasPubinfo: false,
  },
};

export const DEFAULT_STATE: StateCode = 'CA';

/** True if `code` is a configured state. */
export function isStateCode(code: string | null | undefined): code is StateCode {
  return !!code && (STATE_CODES as readonly string[]).includes(code);
}

/** Config for a state code (case-insensitive), or undefined if unknown. */
export function getState(code: string | null | undefined): StateConfig | undefined {
  if (!code) return undefined;
  const up = code.toUpperCase();
  return isStateCode(up) ? STATES[up] : undefined;
}

/** Display label for an internal chamber value within a given state. */
export function chamberLabelFor(state: StateConfig, chamber: 'assembly' | 'senate' | null | undefined): string {
  if (chamber === 'assembly') return state.lowerLabel;
  if (chamber === 'senate') return state.upperLabel;
  return '—';
}

/** Compact district tag (e.g. "AD"/"HD"/"SD") for a chamber within a state. */
export function chamberShortFor(state: StateConfig, chamber: 'assembly' | 'senate' | null | undefined): string {
  if (chamber === 'assembly') return state.lowerShort;
  if (chamber === 'senate') return state.upperShort;
  return '';
}
