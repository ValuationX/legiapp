import type {
  BillDetail,
  BillSummary,
  CalendarEvent,
  CommitteeDetail,
  CommitteeSummary,
  DashboardThisWeek,
  ForeignAffairsResponse,
  LegislatorDetail,
  LegislatorSummary,
  LegislatorVote,
  Paginated,
  SearchResults,
  SourceStatus,
  VoteEventDetail,
} from '@legiapp/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res.json() as Promise<T>;
}

async function send<T>(method: 'POST' | 'DELETE' | 'PUT', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text);
    // Zod validation errors arrive as { error: 'validation', issues: [...] } — summarize them.
    if (j.error === 'validation' && Array.isArray(j.issues)) {
      const msgs = j.issues.map((i: { message?: string }) => i.message).filter(Boolean);
      return msgs.length ? msgs.join('; ') : 'Invalid input.';
    }
    return (j.error as string) ?? text;
  } catch {
    return text || `API ${res.status}`;
  }
}

export type SponsoredBill = BillSummary & { sponsorType: 'primary' | 'co' };
export interface BillFacets {
  statuses: string[];
  measureTypes: string[];
  subjects: string[];
}

export interface DistrictProperties {
  chamber: 'assembly' | 'senate';
  district: number;
  legislatorId: string | null;
  member: string | null;
  party: string | null;
  photoUrl: string | null;
}
export interface DistrictFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: DistrictProperties;
}
export interface DistrictCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

/** Per-state display config + how much data is loaded (from GET /api/meta/states). */
export interface StateMeta {
  code: string;
  name: string;
  lowerLabel: string;
  upperLabel: string;
  lowerShort: string;
  upperShort: string;
  lowerSeats: number;
  upperSeats: number;
  mapCenter: [number, number];
  mapZoom: number;
  billsLoaded: number;
}

// Active state (2-letter USPS). Mirrored synchronously here so the request
// builders below can read it without a React context; StateProvider is the
// source of truth and calls setActiveState() whenever the user switches.
let activeState = (typeof localStorage !== 'undefined' && localStorage.getItem('legiapp.state')) || 'CA';
export function getStateCode(): string {
  return activeState;
}
export function setActiveState(code: string): void {
  activeState = code;
}
/** Append the active state to a query string (the API defaults to CA if absent). */
function ws(qs?: string): string {
  const s = `state=${encodeURIComponent(activeState)}`;
  return qs ? `${qs}&${s}` : s;
}

export const api = {
  legislators: (qs: string) => get<Paginated<LegislatorSummary>>(`/legislators?${ws(qs)}`),
  legislator: (id: string) => get<LegislatorDetail>(`/legislators/${encodeURIComponent(id)}`),
  legislatorVotes: (id: string) => get<LegislatorVote[]>(`/legislators/${encodeURIComponent(id)}/votes`),
  legislatorBills: (id: string) => get<SponsoredBill[]>(`/legislators/${encodeURIComponent(id)}/bills`),
  bills: (qs: string) => get<Paginated<BillSummary>>(`/bills?${ws(qs)}`),
  bill: (id: string) => get<BillDetail>(`/bills/${encodeURIComponent(id)}`),
  billFacets: () => get<BillFacets>(`/bills-facets?${ws()}`),
  committees: (qs: string) => get<CommitteeSummary[]>(`/committees?${ws(qs)}`),
  committee: (id: string) => get<CommitteeDetail>(`/committees/${encodeURIComponent(id)}`),
  committeeBills: (id: string) => get<BillSummary[]>(`/committees/${encodeURIComponent(id)}/bills`),
  vote: (id: string) => get<VoteEventDetail>(`/votes/${encodeURIComponent(id)}`),
  districts: (chamber: 'assembly' | 'senate') => get<DistrictCollection>(`/districts/${chamber}?${ws()}`),
  calendar: (qs: string) => get<CalendarEvent[]>(`/calendar?${ws(qs)}`),
  foreignAffairs: (qs: string) => get<ForeignAffairsResponse>(`/foreign-affairs?${ws(qs)}`),
  search: (q: string) => get<SearchResults>(`/search?${ws(`q=${encodeURIComponent(q)}`)}`),
  thisWeek: () => get<DashboardThisWeek>(`/dashboard/this-week?${ws()}`),
  sources: () => get<SourceStatus[]>(`/meta/sources`),
  meta: {
    states: () => get<StateMeta[]>(`/meta/states`),
  },

  // ── Shared access-code gate ──
  access: {
    status: () => get<{ authorized: boolean }>(`/access/status`),
    submit: (code: string) =>
      send<{ ok: boolean }>('POST', `/access`, { code })
        .then(() => true)
        .catch(() => false),
  },
};
