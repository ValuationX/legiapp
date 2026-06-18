import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, MemberCell, PartyBadge, SourceBadge, StatusBadge } from '@/components/common';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { chamberLabel, formatDate } from '@/lib/format';

export default function CommitteeDetail() {
  const { id = '' } = useParams();
  const cmte = useQuery({ queryKey: ['committee', id], queryFn: () => api.committee(id) });
  const bills = useQuery({ queryKey: ['committee-bills', id], queryFn: () => api.committeeBills(id) });

  if (cmte.isError) return <ErrorState error={cmte.error} />;
  const c = cmte.data;

  return (
    <div>
      <Link to="/committees" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Committees
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{c ? c.name : <Skeleton className="h-7 w-48" />}</h1>
            {c ? <Badge className="bg-secondary text-secondary-foreground">{chamberLabel(c.chamber)}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{c?.memberCount ? `${c.memberCount} members` : 'Standing committee'}</p>
        </div>
        {c ? <SourceBadge source={c.source} lastVerified={c.lastVerified} conflict={c.conflict} /> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Roster */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {!c ? (
              <Skeleton className="h-32 w-full" />
            ) : c.members.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No roster available for this committee.
                <div className="mt-1 text-xs">Run <code>npm run ingest -- committees</code> to refresh memberships.</div>
              </div>
            ) : (
              <div className="space-y-1">
                {c.members.map((m) => (
                  <div key={m.legislatorId ?? m.fullName} className="flex items-center justify-between gap-2 py-1">
                    {m.legislatorId ? (
                      <MemberCell id={m.legislatorId} name={m.fullName} party={m.party} chamber={m.chamber} district={m.district} />
                    ) : (
                      <span className="text-sm">{m.fullName}</span>
                    )}
                    {m.role !== 'member' ? (
                      <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">
                        {m.role === 'vice_chair' ? 'Vice Chair' : 'Chair'}
                      </Badge>
                    ) : (
                      <PartyBadge party={m.party} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bills in committee */}
        <Card>
          <CardHeader>
            <CardTitle>Bills currently here</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : bills.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No bills currently located in this committee.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-20">Bill</TH>
                    <TH>Title</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {bills.data?.slice(0, 30).map((b) => (
                    <TR key={b.id}>
                      <TD>
                        <Link to={`/bills/${b.id}`} className="font-semibold text-primary hover:underline">
                          {b.identifier}
                        </Link>
                      </TD>
                      <TD className="max-w-xs">
                        <span className="line-clamp-1 text-sm">{b.title}</span>
                      </TD>
                      <TD>
                        <StatusBadge status={b.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {c?.recentHearings?.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Recent hearings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {c.recentHearings.slice(0, 24).map((h, i) => (
              <Link
                key={i}
                to={h.billId ? `/bills/${h.billId}` : '#'}
                className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
              >
                <span className="font-medium">{h.billIdentifier ?? '—'}</span>
                <span className="text-muted-foreground"> · {formatDate(h.date)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
