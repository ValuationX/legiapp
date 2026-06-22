import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Gavel } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, PartyBadge, SourceBadge, StatusBadge, VoteBar } from '@/components/common';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { chamberLabel, formatDate } from '@/lib/format';

export default function BillDetail() {
  const { id = '' } = useParams();
  const { data: b, isLoading, isError, error } = useQuery({ queryKey: ['bill', id], queryFn: () => api.bill(id) });

  if (isError) return <ErrorState error={error} />;

  return (
    <div>
      <Link to="/bills" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Bills
      </Link>

      {isLoading || !b ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{b.identifier}</h1>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-1 max-w-3xl text-base text-muted-foreground">{b.title ?? 'Untitled measure'}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <SourceBadge source={b.source} lastVerified={b.lastVerified} conflict={b.conflict} />
              {b.id.startsWith('CA:') ? (
                <a
                  href={`https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=${b.id.replace(/^[A-Z]{2}:/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  View full bill on leginfo.ca.gov ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            {/* Main column */}
            <div className="space-y-4">
              {/* Legislative Counsel's Digest */}
              {b.summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Legislative Counsel's Digest</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground/90">{b.summary}</p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Sponsors */}
              <Card>
                <CardHeader>
                  <CardTitle>Authors &amp; co-authors ({b.sponsors.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {b.sponsors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recorded authors.</p>
                  ) : (
                    b.sponsors.map((s, i) => {
                      const inner = (
                        <>
                          {s.type === 'primary' ? <Gavel className="h-3 w-3" /> : null}
                          <span className="font-medium">{s.legislatorName}</span>
                          {s.party ? <PartyBadge party={s.party} /> : null}
                        </>
                      );
                      return s.legislatorId ? (
                        <Link
                          key={`${s.legislatorName}-${i}`}
                          to={`/legislators/${s.legislatorId}`}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-accent ${s.type === 'primary' ? 'border-primary/30 bg-primary/5' : ''}`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span
                          key={`${s.legislatorName}-${i}`}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm text-muted-foreground"
                          title="Not linked to a current member profile"
                        >
                          {inner}
                        </span>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Votes */}
              <Card>
                <CardHeader>
                  <CardTitle>Votes ({b.votes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {b.votes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recorded votes yet.</p>
                  ) : (
                    b.votes.map((v) => (
                      <Link
                        key={v.id}
                        to={`/votes/${v.id}`}
                        className="block rounded-md border p-3 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge className={v.isFloor ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}>
                              {v.isFloor ? 'Floor' : 'Committee'}
                            </Badge>
                            <span className="font-medium">{v.locationName ?? chamberLabel(v.chamber)}</span>
                          </div>
                          <span className="text-xs tabular text-muted-foreground">{formatDate(v.date)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="w-40">
                            <VoteBar ayes={v.ayes} noes={v.noes} abstain={v.abstain} />
                          </div>
                          <span className="text-sm tabular">
                            <span className="font-medium text-yea">{v.ayes ?? 0}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span className="font-medium text-nay">{v.noes ?? 0}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{v.result}</span>
                        </div>
                        {v.motion ? <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{v.motion}</p> : null}
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle>History ({b.actions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-3 border-l pl-5">
                    {b.actions.map((a) => (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-border ring-2 ring-background" />
                        <div className="text-xs tabular text-muted-foreground">{formatDate(a.date)}</div>
                        <div className="text-sm">{a.description}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <Meta label="Session" value={b.session} />
                  <Meta label="Type" value={b.measureType} />
                  <Meta label="Origin" value={chamberLabel(b.chamberOfOrigin)} />
                  <Meta label="Current location" value={b.currentLocation ?? '—'} />
                  <Meta label="Introduced" value={formatDate(b.introducedDate)} />
                  <Meta label="Last action" value={formatDate(b.lastActionDate)} />
                  {b.subjects.length ? (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Subjects</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.subjects.map((s) => (
                          <Badge key={s} className="bg-secondary text-secondary-foreground">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
