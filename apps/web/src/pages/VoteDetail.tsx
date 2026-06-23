import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { VoteOption } from '@legiapp/shared';
import { ErrorState, PartyBadge, VoteBar } from '@/components/common';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { chamberLabel, formatDate, voteOptionMeta } from '@/lib/format';

const GROUPS: { key: VoteOption; title: string }[] = [
  { key: 'yea', title: 'Aye' },
  { key: 'nay', title: 'No' },
  { key: 'abstain', title: 'Abstain / Other' },
];

export default function VoteDetail() {
  const { id = '' } = useParams();
  const { data: v, isLoading, isError, error } = useQuery({ queryKey: ['vote', id], queryFn: () => api.vote(id) });

  if (isError) return <ErrorState error={error} />;

  return (
    <div>
      <Link
        to={v ? `/bills/${v.billId}` : '/bills'}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {isLoading || !v ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={v.isFloor ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}>
                      {v.isFloor ? 'Floor vote' : 'Committee vote'}
                    </Badge>
                    <span className="text-sm font-medium">{v.locationName ?? chamberLabel(v.chamber)}</span>
                    <span className="text-sm text-muted-foreground">· {formatDate(v.date)}</span>
                  </div>
                  <h1 className="mt-2 text-lg font-semibold">
                    <Link to={`/bills/${v.billId}`} className="text-primary hover:underline">
                      {v.billIdentifier}
                    </Link>{' '}
                    <span className="font-normal text-muted-foreground">{v.billTitle}</span>
                  </h1>
                  {v.motion ? <p className="mt-1 text-sm text-muted-foreground">{v.motion}</p> : null}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{v.result}</div>
                  <div className="text-sm tabular">
                    <span className="font-semibold text-yea">{v.ayes ?? 0}</span> aye ·{' '}
                    <span className="font-semibold text-nay">{v.noes ?? 0}</span> no ·{' '}
                    <span className="text-muted-foreground">{v.abstain ?? 0}</span> other
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <VoteBar ayes={v.ayes} noes={v.noes} abstain={v.abstain} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {GROUPS.map((g) => {
              const members = v.records.filter((r) =>
                g.key === 'abstain' ? r.option !== 'yea' && r.option !== 'nay' : r.option === g.key,
              );
              const tone = voteOptionMeta(g.key).className;
              return (
                <Card key={g.key}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${tone}`}>{g.title}</h3>
                      <span className="text-sm font-medium tabular text-muted-foreground">{members.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {members.map((r, i) => (
                        <li key={`${r.legislatorName}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                          {r.legislatorId ? (
                            <Link to={`/legislators/${r.legislatorId}`} className="truncate hover:underline">
                              {r.legislatorName}
                            </Link>
                          ) : (
                            <span className="truncate text-muted-foreground" title="Not linked to a current member">
                              {r.legislatorName}
                            </span>
                          )}
                          <PartyBadge party={r.party} />
                        </li>
                      ))}
                      {members.length === 0 ? <li className="text-xs text-muted-foreground">None</li> : null}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
