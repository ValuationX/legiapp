import { FA_REGION_BY_KEY } from '@legiapp/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader, PartyBadge } from '@/components/common';
import { Skeleton } from '@/components/ui/primitives';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, type LeadershipRow } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { useStateLabels } from '@/lib/state';

export default function Leadership() {
  const sl = useStateLabels();
  const { showForeignAffairs } = useSettings();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['leadership'], queryFn: api.leadership });
  if (isError) return <ErrorState error={error} />;

  const rows = data ?? [];
  const senate = rows.filter((r) => r.chamber === 'senate');
  const assembly = rows.filter((r) => r.chamber === 'assembly');

  return (
    <div>
      <PageHeader
        title="Leadership"
        subtitle={`Who controls the agenda in the ${sl.name} Legislature${showForeignAffairs ? " — with each leader's Ukraine & foreign-affairs record" : ''}.`}
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leadership roster is loaded for this state yet.</p>
      ) : (
        <div className="space-y-8">
          <Section title={`${sl.upperLabel} leadership`} rows={senate} showFA={showForeignAffairs} />
          <Section title={`${sl.lowerLabel} leadership`} rows={assembly} showFA={showForeignAffairs} />
        </div>
      )}
    </div>
  );
}

function Section({ title, rows, showFA }: { title: string; rows: LeadershipRow[]; showFA: boolean }) {
  if (!rows.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <THead>
            <TR>
              <TH className="w-56">Position</TH>
              <TH>Member</TH>
              <TH className="w-14">Dist.</TH>
              {showFA ? <TH>Ukraine &amp; foreign-affairs record</TH> : null}
            </TR>
          </THead>
          <TBody>
            {rows.map((r, i) => (
              <TR key={`${r.role}-${r.legislatorId}-${i}`}>
                <TD className="text-sm font-medium">{r.role}</TD>
                <TD>
                  {r.legislatorId ? (
                    <Link to={`/legislators/${r.legislatorId}`} className="font-medium text-primary hover:underline">
                      {r.fullName}
                    </Link>
                  ) : (
                    <span className="font-medium">{r.fullName}</span>
                  )}
                  {r.party ? (
                    <span className="ml-2 align-middle">
                      <PartyBadge party={r.party} />
                    </span>
                  ) : null}
                </TD>
                <TD className="text-sm tabular text-muted-foreground">{r.district ?? '—'}</TD>
                {showFA ? (
                  <TD>
                    {r.faBills.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No record</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.faBills.map((b) => (
                          <Link
                            key={b.id}
                            to={`/bills/${b.id}`}
                            title={`${b.type === 'primary' ? 'Lead author' : 'Co-author'}${
                              b.regions?.length
                                ? ` · ${b.regions.map((x) => FA_REGION_BY_KEY.get(x)?.label ?? x).join(', ')}`
                                : ''
                            }`}
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent ${
                              b.type === 'primary' ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border'
                            }`}
                          >
                            {b.identifier}
                            <span className="text-[10px] uppercase text-muted-foreground">
                              {b.type === 'primary' ? 'lead' : 'co'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </TD>
                ) : null}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
