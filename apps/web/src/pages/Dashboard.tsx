import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CalendarDays, FileText, Flag, Gavel, Users, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader, SourceBadge, StatusBadge } from '@/components/common';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { calendarTypeMeta, chamberLabel, formatCalendarDate, formatDate } from '@/lib/format';
import { useStateLabels } from '@/lib/state';

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const week = useQuery({ queryKey: ['this-week'], queryFn: api.thisWeek });
  const legs = useQuery({ queryKey: ['legislators-total'], queryFn: () => api.legislators('pageSize=1') });
  const cmtes = useQuery({ queryKey: ['committees-all'], queryFn: () => api.committees('') });

  const fresh = week.data?.dataFreshness?.[0];
  const sl = useStateLabels();

  return (
    <div>
      <PageHeader
        title="This Week"
        subtitle={`Upcoming hearings and recently moved bills across the ${sl.name} Legislature.`}
      >
        {fresh ? <SourceBadge source={fresh.source} lastVerified={fresh.lastVerified} /> : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FileText} label="Bills tracked" value={fresh?.records?.toLocaleString() ?? <Skeleton className="h-7 w-16" />} />
        <Stat icon={Gavel} label="Recently moved" value={week.data ? week.data.recentlyMovedBills.length : <Skeleton className="h-7 w-10" />} />
        <Stat icon={CalendarClock} label="Upcoming hearings" value={week.data ? week.data.upcomingHearings.length : <Skeleton className="h-7 w-10" />} />
        <Stat icon={Users} label="Legislators" value={legs.data?.total ?? <Skeleton className="h-7 w-10" />} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Upcoming deadlines &amp; elections
          </CardTitle>
          <Link to="/calendar" className="text-xs font-medium text-primary hover:underline">
            Full calendar →
          </Link>
        </CardHeader>
        <CardContent>
          {week.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !week.data?.upcomingDeadlines?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No upcoming deadlines on the calendar.</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {week.data.upcomingDeadlines.slice(0, 6).map((d) => {
                const meta = calendarTypeMeta(d.type);
                return (
                  <Link
                    key={d.id}
                    to="/calendar"
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                  >
                    <div className="w-14 shrink-0 text-xs font-medium tabular text-muted-foreground">
                      {formatCalendarDate(d.date)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{d.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge className={meta.badge}>
                          {d.type === 'election' ? <Vote className="h-3 w-3" aria-hidden /> : null}
                          {meta.label}
                        </Badge>
                        {d.deadlineFlag ? (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-rep-fg">
                            <Flag className="h-3 w-3" aria-hidden /> deadline
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Upcoming hearings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {week.isError ? <ErrorState error={week.error} /> : null}
            {week.isLoading ? (
              <SkeletonList />
            ) : week.data?.upcomingHearings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No scheduled hearings.</p>
            ) : (
              week.data?.upcomingHearings.slice(0, 12).map((h) => (
                <Link
                  key={h.id}
                  to={h.billId ? `/bills/${h.billId}` : '#'}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                >
                  <div className="w-16 shrink-0 text-xs font-medium tabular text-muted-foreground">
                    {formatDate(h.date)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="font-medium">{h.billIdentifier ?? '—'}</span>
                      {h.billTitle ? <span className="text-muted-foreground"> · {h.billTitle}</span> : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{h.committeeName ?? 'Committee'}</div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-4 w-4" /> Recently moved bills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {week.isLoading ? (
              <SkeletonList />
            ) : week.data?.recentlyMovedBills.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent movement.</p>
            ) : (
              week.data?.recentlyMovedBills.slice(0, 12).map((b) => (
                <Link
                  key={b.id}
                  to={`/bills/${b.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                >
                  <div className="w-16 shrink-0 text-xs font-medium tabular text-muted-foreground">
                    {formatDate(b.lastActionDate)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="font-medium">{b.identifier}</span>
                      <span className="text-muted-foreground"> · {b.title}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {chamberLabel(b.chamberOfOrigin)} · {b.lastActionDescription}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {cmtes.data ? `${cmtes.data.length} committees · ` : ''}Data for {sl.name} normalized from{' '}
        {sl.name === 'California' ? 'the official California Legislature PUBINFO dataset' : 'the Open States project'}.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
