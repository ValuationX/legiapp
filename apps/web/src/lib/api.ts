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

export const api = {
  legislators: (qs: string) => get<Paginated<LegislatorSummary>>(`/legislators?${qs}`),
  legislator: (id: string) => get<LegislatorDetail>(`/legislators/${encodeURIComponent(id)}`),
  legislatorVotes: (id: string) => get<LegislatorVote[]>(`/legislators/${encodeURIComponent(id)}/votes`),
  legislatorBills: (id: string) => get<SponsoredBill[]>(`/legislators/${encodeURIComponent(id)}/bills`),
  bills: (qs: string) => get<Paginated<BillSummary>>(`/bills?${qs}`),
  bill: (id: string) => get<BillDetail>(`/bills/${encodeURIComponent(id)}`),
  billFacets: () => get<BillFacets>(`/bills-facets`),
  committees: (qs: string) => get<CommitteeSummary[]>(`/committees?${qs}`),
  committee: (id: string) => get<CommitteeDetail>(`/committees/${encodeURIComponent(id)}`),
  committeeBills: (id: string) => get<BillSummary[]>(`/committees/${encodeURIComponent(id)}/bills`),
  vote: (id: string) => get<VoteEventDetail>(`/votes/${encodeURIComponent(id)}`),
  districts: (chamber: 'assembly' | 'senate') => get<DistrictCollection>(`/districts/${chamber}`),
  calendar: (qs: string) => get<CalendarEvent[]>(`/calendar?${qs}`),
  foreignAffairs: (qs: string) => get<ForeignAffairsResponse>(`/foreign-affairs?${qs}`),
  search: (q: string) => get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  thisWeek: () => get<DashboardThisWeek>(`/dashboard/this-week`),
  sources: () => get<SourceStatus[]>(`/meta/sources`),

  // ── Shared access-code gate ──
  access: {
    status: () => get<{ authorized: boolean }>(`/access/status`),
    submit: (code: string) =>
      send<{ ok: boolean }>('POST', `/access`, { code })
        .then(() => true)
        .catch(() => false),
  },
};
