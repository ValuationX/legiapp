import { BILL_STATUS_BUCKET_LABELS, type Chamber, type VoteOption, billStatusBucket, getState } from '@legiapp/shared';
import { getStateCode } from '@/lib/api';

export interface PartyMeta {
  code: string;
  label: string;
  badge: string; // tailwind classes for a soft badge
  dot: string; // tailwind bg class for a dot/bar
}

export function partyMeta(party: string | null | undefined): PartyMeta {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return { code: 'D', label: 'Democratic', badge: 'bg-dem-soft text-dem-fg ring-1 ring-dem/20', dot: 'bg-dem' };
  if (p.startsWith('r')) return { code: 'R', label: 'Republican', badge: 'bg-rep-soft text-rep-fg ring-1 ring-rep/20', dot: 'bg-rep' };
  return { code: '—', label: party || 'Unknown', badge: 'bg-muted text-muted-foreground ring-1 ring-border', dot: 'bg-muted-foreground' };
}

/** Hex/HSL fill color for a party (for map polygons, charts). */
export function partyColor(party: string | null | undefined): string {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'hsl(217 91% 45%)';
  if (p.startsWith('r')) return 'hsl(0 72% 48%)';
  return 'hsl(215 16% 55%)';
}

export function stanceMeta(stance: string): { label: string; badge: string } {
  switch (stance) {
    case 'support':
      return { label: 'Support', badge: 'bg-yea/10 text-yea ring-1 ring-yea/25' };
    case 'oppose':
      return { label: 'Oppose', badge: 'bg-rep-soft text-rep-fg ring-1 ring-rep/25' };
    case 'mixed':
      return { label: 'Mixed', badge: 'bg-nay/10 text-nay ring-1 ring-nay/25' };
    case 'neutral':
      return { label: 'Neutral', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    default:
      return { label: 'Unknown', badge: 'bg-muted text-muted-foreground ring-1 ring-border' };
  }
}

// State-aware: lower house is "Assembly" for CA/NY but "House" elsewhere. Reads the
// active state synchronously (set by StateProvider) so every call site is correct
// without threading state through — switching states refetches + re-renders consumers.
export function chamberLabel(c: Chamber | null | undefined): string {
  const st = getState(getStateCode());
  if (c === 'assembly') return st?.lowerLabel ?? 'Assembly';
  if (c === 'senate') return st?.upperLabel ?? 'Senate';
  return '—';
}

export function chamberShort(c: Chamber | null | undefined): string {
  const st = getState(getStateCode());
  if (c === 'assembly') return st?.lowerShort ?? 'AD';
  if (c === 'senate') return st?.upperShort ?? 'SD';
  return '';
}

export function voteOptionMeta(o: VoteOption): { label: string; className: string } {
  switch (o) {
    case 'yea':
      return { label: 'Aye', className: 'text-yea' };
    case 'nay':
      return { label: 'No', className: 'text-nay' };
    case 'abstain':
      return { label: 'Abstain', className: 'text-muted-foreground' };
    case 'absent':
      return { label: 'Absent', className: 'text-muted-foreground' };
    default:
      return { label: 'Other', className: 'text-muted-foreground' };
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Date formatter for calendar all-day events (pinned to UTC like the day chips,
 * so every calendar surface agrees on the day regardless of viewer timezone). */
export function formatCalendarDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Label + badge classes for a legislator's issue-alignment level. */
export function alignmentMeta(level: string): { label: string; badge: string } {
  switch (level) {
    case 'champion':
      return { label: 'Champion', badge: 'bg-yea/15 text-yea ring-1 ring-yea/30' };
    case 'strong-ally':
      return { label: 'Strong Ally', badge: 'bg-dem-soft text-dem-fg ring-1 ring-dem/25' };
    case 'ally':
      return { label: 'Ally', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    default:
      return { label: 'Supporter', badge: 'bg-muted text-muted-foreground ring-1 ring-border' };
  }
}

/** Label + soft-badge classes for a calendar event type. */
export function calendarTypeMeta(type: string | null | undefined): { label: string; badge: string } {
  switch (type) {
    case 'election':
      return { label: 'Election', badge: 'bg-dem-soft text-dem-fg ring-1 ring-dem/25' };
    case 'governor':
      return { label: 'Governor', badge: 'bg-rep-soft text-rep-fg ring-1 ring-rep/25' };
    case 'budget':
      return { label: 'Budget', badge: 'bg-yea/10 text-yea ring-1 ring-yea/25' };
    case 'introduction':
      return { label: 'Introduction', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    case 'committee':
      return { label: 'Committee', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    case 'fiscal':
      return { label: 'Fiscal', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    case 'floor':
      return { label: 'Floor', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    case 'house-of-origin':
      return { label: 'House of Origin', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
    case 'recess':
      return { label: 'Recess', badge: 'bg-muted text-muted-foreground ring-1 ring-border' };
    case 'holiday':
      return { label: 'Holiday', badge: 'bg-muted text-muted-foreground ring-1 ring-border' };
    case 'session':
      return { label: 'Session', badge: 'bg-muted text-muted-foreground ring-1 ring-border' };
    default:
      return { label: 'Deadline', badge: 'bg-secondary text-secondary-foreground ring-1 ring-border' };
  }
}

/** Month-year header (UTC, so all-day events group under the right month). */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Short day chip ("Tue Jun 2") for calendar rows, formatted in UTC. */
export function formatDayChip(iso: string | null | undefined): { weekday: string; day: string; month: string } {
  if (!iso) return { weekday: '', day: '—', month: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { weekday: '', day: '—', month: '' };
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    day: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
  };
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  const day = 86_400_000;
  if (Math.abs(diff) < day) return 'today';
  const days = Math.round(diff / day);
  if (days > 0) return `${days}d ago`;
  return `in ${-days}d`;
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** A bill status mapped to a friendly bucket label + a badge tone (Tailwind classes).
 *  For the catch-all 'other' bucket we keep the raw status text so unusual-but-real
 *  values still read sensibly. */
export function statusMeta(status: string | null | undefined): { label: string; tone: string } {
  const bucket = billStatusBucket(status);
  const label = bucket === 'other' ? (status ?? '—') : BILL_STATUS_BUCKET_LABELS[bucket];
  const tone =
    bucket === 'signed' || bucket === 'passed_chamber'
      ? 'bg-yea/10 text-yea ring-1 ring-yea/20'
      : bucket === 'vetoed' || bucket === 'failed'
        ? 'bg-rep-soft text-rep-fg ring-1 ring-rep/20'
        : 'bg-secondary text-secondary-foreground ring-1 ring-border';
  return { label, tone };
}
