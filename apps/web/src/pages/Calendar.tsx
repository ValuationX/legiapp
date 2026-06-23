import { useQuery } from '@tanstack/react-query';
import type { CalendarEvent } from '@legiapp/shared';
import { CalendarDays, ExternalLink, Flag, Vote } from 'lucide-react';
import * as React from 'react';
import { EmptyState, ErrorState, PageHeader, SourceBadge } from '@/components/common';
import { Badge, Card, CardContent, Select, Skeleton } from '@/components/ui/primitives';
import { cn, safeHref } from '@/lib/utils';
import { api } from '@/lib/api';
import { calendarTypeMeta, formatCalendarDate, formatDayChip, monthKey } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All event types' },
  { value: 'election', label: 'Elections' },
  { value: 'introduction', label: 'Bill introduction' },
  { value: 'committee', label: 'Policy committee' },
  { value: 'fiscal', label: 'Fiscal committee' },
  { value: 'floor', label: 'Floor' },
  { value: 'house-of-origin', label: 'House of origin' },
  { value: 'budget', label: 'Budget' },
  { value: 'governor', label: 'Governor' },
  { value: 'recess', label: 'Recess' },
  { value: 'session', label: 'Session' },
  { value: 'holiday', label: 'Holiday' },
];

function DayChip({ date, accent }: { date: string; accent: boolean }) {
  const c = formatDayChip(date);
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center rounded-md border py-1.5 text-center',
        accent ? 'border-dem/30 bg-dem-soft/50' : 'border-border bg-muted/40',
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.weekday}</span>
      <span className="text-lg font-semibold leading-none tabular">{c.day}</span>
      <span className="text-[10px] uppercase text-muted-foreground">{c.month}</span>
    </div>
  );
}

function EventRow({ e }: { e: CalendarEvent }) {
  const meta = calendarTypeMeta(e.type);
  const isElection = e.type === 'election';
  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-accent/40">
      <DayChip date={e.date} accent={isElection} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={meta.badge}>
            {isElection ? <Vote className="h-3 w-3" aria-hidden /> : null}
            {meta.label}
          </Badge>
          {e.deadlineFlag ? (
            <Badge className="bg-rep-soft text-rep-fg ring-1 ring-rep/25">
              <Flag className="h-3 w-3" aria-hidden /> Deadline
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium leading-snug">{e.title}</p>
        {e.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p> : null}
        {safeHref(e.sourceUrl) ? (
          <a
            href={safeHref(e.sourceUrl)!}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Official source <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Highlight({ event, label }: { event: CalendarEvent | undefined; label: string }) {
  if (!event) return null;
  const meta = calendarTypeMeta(event.type);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold leading-tight">{formatCalendarDate(event.date)}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge className={meta.badge}>{meta.label}</Badge>
        </div>
        <p className="mt-1.5 text-sm leading-snug">{event.title}</p>
      </CardContent>
    </Card>
  );
}

export default function Calendar() {
  const [type, setType] = React.useState('');
  const [scope, setScope] = React.useState<'upcoming' | 'all'>('upcoming');
  const [deadlinesOnly, setDeadlinesOnly] = React.useState(false);
  const sl = useStateLabels();
  const { state } = useStateCtx();

  const qs = new URLSearchParams();
  if (type) qs.set('type', type);
  if (scope === 'upcoming') qs.set('upcoming', 'true');
  if (deadlinesOnly) qs.set('deadline', 'true');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendar', state, qs.toString()],
    queryFn: () => api.calendar(qs.toString()),
  });

  // Sort client-side so "next" highlights and month grouping never depend on the
  // server's row order (Date-based, not string compare).
  const events = React.useMemo(
    () => [...(data ?? [])].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [data],
  );
  const now = new Date();
  // "Next election" = the next actual election *day*, not an election-related
  // milestone (filing/registration deadline, ballot mailing, nomination window,
  // vote-by-mail start) that also carries type 'election' in CA's curated data.
  // Type-based so it works for every state (CA tags milestones; others don't).
  const ELECTION_MILESTONE = /regist|filing|nomination|vote.?by.?mail|\bvbm\b|ballot|deadline|last day/i;
  const nextElection = events.find(
    (e) =>
      e.type === 'election' &&
      !e.deadlineFlag &&
      !ELECTION_MILESTONE.test(`${e.title} ${e.detail ?? ''}`) &&
      new Date(e.date) >= now,
  );
  const nextDeadline = events.find((e) => e.deadlineFlag && new Date(e.date) >= now);

  // Group chronologically by month for readable scanning.
  const groups: { key: string; items: CalendarEvent[] }[] = [];
  for (const e of events) {
    const key = monthKey(e.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, items: [e] });
  }

  // Header provenance is derived from the distinct source hostnames of the loaded
  // events, so it stays correct for every state (per-event "Official source" links
  // carry the exact row-level traceability).
  const latestVerified = events.reduce<string | null>(
    (max, e) => (e.lastVerified && (!max || e.lastVerified > max) ? e.lastVerified : max),
    null,
  );
  const sourceLabel = React.useMemo(() => {
    const hosts = new Set<string>();
    for (const e of events) {
      const href = safeHref(e.sourceUrl);
      if (!href) continue;
      try {
        hosts.add(new URL(href).hostname.replace(/^www\./, ''));
      } catch {
        /* ignore unparseable */
      }
    }
    return [...hosts].sort().join(' · ');
  }, [events]);

  return (
    <div>
      <PageHeader
        title="Legislative Calendar"
        subtitle={`Key legislative deadlines and ${sl.name} statewide election milestones — your windows to influence a bill's fate.`}
      >
        {events.length && sourceLabel ? <SourceBadge source={sourceLabel} lastVerified={latestVerified} /> : null}
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Highlight event={nextElection} label="Next election" />
        <Highlight event={nextDeadline} label="Next deadline" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by event type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="max-w-xs"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Time scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'upcoming' | 'all')}
        >
          <option value="upcoming">Upcoming only</option>
          <option value="all">Whole session</option>
        </Select>
        <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={deadlinesOnly}
            onChange={(e) => setDeadlinesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Hard deadlines only
        </label>
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No calendar events match"
          hint="Try widening the filters or switching to the whole session. Run `npm run ingest -- calendar` to populate dates."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="sticky top-14 z-[1] mb-1 flex items-center gap-2 bg-background/90 py-1 text-sm font-semibold tracking-tight backdrop-blur">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden /> {g.key}
                <span className="text-xs font-normal text-muted-foreground">· {g.items.length}</span>
              </h2>
              <Card>
                <CardContent className="divide-y p-2">
                  {g.items.map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
