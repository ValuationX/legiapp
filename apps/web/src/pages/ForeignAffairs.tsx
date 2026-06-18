import { useQuery } from '@tanstack/react-query';
import type { FaSponsor, ForeignAffairsBill } from '@legiapp/shared';
import { Download, Flag, Globe, Mail, Trophy, UserX } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/common';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { alignmentMeta, formatDate, partyMeta } from '@/lib/format';
import { useStateLabels } from '@/lib/state';
import { cn } from '@/lib/utils';

function SponsorChip({ s }: { s: FaSponsor }) {
  const p = partyMeta(s.party);
  const inner = (
    <>
      <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} aria-hidden />
      {s.name}
      {!s.currentlyInOffice ? (
        <span className="inline-flex items-center gap-0.5 text-rep-fg" title="No longer in office">
          <UserX className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
    </>
  );
  const cls = cn(
    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
    s.currentlyInOffice ? 'border-border bg-card' : 'border-rep/20 bg-rep-soft/40 text-muted-foreground',
  );
  return s.legislatorId ? (
    <Link to={`/legislators/${s.legislatorId}`} className={cn(cls, 'hover:bg-accent')}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

const COLLAPSE_COAUTHORS_AT = 8;

function BillCard({ b }: { b: ForeignAffairsBill }) {
  const [showCo, setShowCo] = React.useState(false);
  const formerCount = b.coauthors.filter((c) => !c.currentlyInOffice).length;
  const showAll = showCo || b.coauthors.length <= COLLAPSE_COAUTHORS_AT;
  const visibleCoauthors = showAll ? b.coauthors : b.coauthors.slice(0, COLLAPSE_COAUTHORS_AT);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/bills/${b.id}`} className="font-semibold text-primary hover:underline">
            {b.identifier}
          </Link>
          <Badge className="bg-secondary text-secondary-foreground">{b.session}</Badge>
          {b.chamberOfOrigin ? (
            <Badge className="bg-secondary capitalize text-secondary-foreground">{b.chamberOfOrigin}</Badge>
          ) : null}
          {b.regions.map((r) => (
            <Badge key={r} className="bg-dem-soft text-dem-fg ring-1 ring-dem/25 capitalize">
              {r}
            </Badge>
          ))}
          {b.signed ? (
            <Badge className="bg-yea/10 text-yea ring-1 ring-yea/25">
              <Flag className="h-3 w-3" aria-hidden /> Chaptered
            </Badge>
          ) : null}
          <StatusBadge status={b.status} />
          <span className="ml-auto text-xs text-muted-foreground">{formatDate(b.lastActionDate)}</span>
        </div>

        <p className="mt-1.5 text-sm font-medium leading-snug">{b.title ?? 'Resolution'}</p>
        {b.digestSnippet ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.digestSnippet}</p>
        ) : null}

        <div className="mt-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Author{b.authors.length > 1 ? 's' : ''}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {b.authors.length ? (
              b.authors.map((s, i) => <SponsorChip key={`a${i}`} s={s} />)
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {b.coauthors.length ? (
          <div className="mt-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Coauthors ({b.coauthors.length}
              {formerCount ? ` · ${formerCount} left office` : ''})
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {visibleCoauthors.map((s, i) => (
                <SponsorChip key={`c${i}`} s={s} />
              ))}
            </div>
            {b.coauthors.length > COLLAPSE_COAUTHORS_AT ? (
              <button
                type="button"
                onClick={() => setShowCo((v) => !v)}
                className="mt-1 text-[11px] font-medium text-primary hover:underline"
              >
                {showCo ? 'Show fewer' : `Show all ${b.coauthors.length}`}
              </button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ForeignAffairs() {
  const [params, setParams] = useSearchParams();
  const region = params.get('region') ?? '';
  const setRegion = (r: string) => setParams(r ? { region: r } : {}, { replace: true });
  const sl = useStateLabels();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['foreign-affairs', region],
    queryFn: () => api.foreignAffairs(region ? `region=${region}` : ''),
  });

  const [leaderSort, setLeaderSort] = React.useState<'activity' | 'party'>('activity');
  const [chamber, setChamber] = React.useState<'' | 'assembly' | 'senate'>('');

  const visibleBills = React.useMemo(
    () => (data?.bills ?? []).filter((b) => !chamber || b.chamberOfOrigin === chamber),
    [data?.bills, chamber],
  );

  const leaders = React.useMemo(() => {
    let arr = data?.leaders ? [...data.leaders] : [];
    if (chamber) arr = arr.filter((l) => l.chamber === chamber);
    if (leaderSort === 'party') {
      const rank = (p?: string | null) => {
        const c = partyMeta(p ?? '').code;
        return c === 'D' ? 0 : c === 'R' ? 1 : 2;
      };
      arr.sort((a, b) => rank(a.party) - rank(b.party)); // stable sort keeps score order within a party
    }
    return arr;
  }, [data?.leaders, leaderSort, chamber]);

  const suffixParts = [region, chamber].filter(Boolean);
  const suffix = suffixParts.length ? `-${suffixParts.join('-')}` : '';

  // Bills export — one row per measure, sponsors split into in-office vs left-office.
  const exportBills = () => {
    if (!data) return;
    const rows = visibleBills.map((b) => [
      b.identifier,
      b.session,
      formatDate(b.introducedDate),
      formatDate(b.lastActionDate),
      b.title ?? '',
      b.regions.join('; '),
      b.status ?? '',
      b.signed ? 'Chaptered' : '',
      b.authors.map((a) => a.name).join('; '),
      b.coauthors.length,
      b.coauthors.filter((c) => c.currentlyInOffice).map((c) => c.name).join('; '),
      b.coauthors.filter((c) => !c.currentlyInOffice).map((c) => c.name).join('; '),
    ]);
    const csv = toCsv(
      ['Bill', 'Session', 'Introduced', 'Last action', 'Title', 'Regions', 'Status', 'Chaptered',
       'Author(s)', '# Coauthors', 'Coauthors (in office)', 'Coauthors (left office)'],
      rows,
    );
    downloadCsv(`ukraine-bills${suffix}.csv`, csv);
  };

  // Allies export — the outreach list: one row per legislator with alignment + contact.
  const exportAllies = () => {
    if (!data) return;
    const rows = leaders.map((l) => [
      l.name,
      alignmentMeta(l.level).label,
      l.score,
      l.authored,
      l.coauthored,
      l.passed,
      l.inOffice ? 'In office' : 'Left office',
      l.party ?? '',
      l.chamber ?? '',
      l.email ?? '',
      l.phone ?? '',
    ]);
    const csv = toCsv(
      ['Legislator', 'Alignment', 'Score', 'Authored', 'Coauthored', 'Passed', 'Status', 'Party', 'Chamber', 'Email', 'Phone'],
      rows,
    );
    downloadCsv(`ukraine-allies${suffix}.csv`, csv);
  };

  return (
    <div>
      <PageHeader
        title="Ukraine & Foreign Affairs"
        subtitle={`Ukraine and Ukraine-adjacent ${sl.name} measures across recent sessions — who authored, coauthored, and signed on, including allies who have since left office.`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportBills} disabled={!visibleBills.length}>
            <Download className="h-4 w-4" /> Bills CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllies} disabled={!leaders.length}>
            <Download className="h-4 w-4" /> Allies CSV
          </Button>
        </div>
      </PageHeader>

      {/* Region chips — Ukraine & adjacent first */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <RegionChip active={region === ''} onClick={() => setRegion('')} label="All" />
        {data?.regions
          .filter((r) => r.count > 0)
          .map((r) => (
            <RegionChip
              key={r.key}
              active={region === r.key}
              adjacent={r.adjacent}
              onClick={() => setRegion(r.key)}
              label={`${r.label} (${r.count})`}
            />
          ))}
      </div>

      {/* Chamber filter — separate Senate vs Assembly across bills and the leaderboard */}
      <div className="mb-4 flex items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Chamber:</span>
        <div className="inline-flex rounded-md border bg-card p-0.5">
          {(
            [
              ['', 'Both'],
              ['assembly', 'Assembly'],
              ['senate', 'Senate'],
            ] as const
          ).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setChamber(val)}
              aria-pressed={chamber === val}
              className={cn(
                'rounded px-2.5 py-1 font-medium transition-colors',
                chamber === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Bills */}
          <div className="order-2 space-y-3 lg:order-1">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
            ) : !visibleBills.length ? (
              <EmptyState
                title="No measures found"
                hint={
                  chamber
                    ? `No ${chamber === 'senate' ? 'Senate' : 'Assembly'} measures for the current filters.`
                    : 'Run `npm run ingest -- foreign-affairs` (and the historical PUBINFO sessions) to populate the tracker.'
                }
              />
            ) : (
              visibleBills.map((b) => <BillCard key={b.id} b={b} />)
            )}
          </div>

          {/* Leaderboard — shown first on phones so it's not buried under the bills */}
          <div className="order-1 space-y-4 lg:order-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Most active legislators
                  </CardTitle>
                  <div className="inline-flex rounded-md border bg-card p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLeaderSort('activity')}
                      className={cn(
                        'rounded px-2 py-0.5 font-medium transition-colors',
                        leaderSort === 'activity'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Activity
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderSort('party')}
                      className={cn(
                        'rounded px-2 py-0.5 font-medium transition-colors',
                        leaderSort === 'party'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Party
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : !leaders.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
                ) : (
                  leaders.map((l, i) => {
                    const p = partyMeta(l.party);
                    const lvl = alignmentMeta(l.level);
                    return (
                      <div
                        key={l.legislatorId}
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40"
                      >
                        <span className="w-5 shrink-0 pt-0.5 text-right text-xs tabular text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', p.dot)} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/legislators/${l.legislatorId}`}
                              className="truncate text-sm font-medium hover:underline"
                            >
                              {l.name}
                            </Link>
                            <Badge className={lvl.badge}>{lvl.label}</Badge>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>
                              {l.chamber ? `${l.chamber === 'senate' ? 'Senate' : 'Assembly'} · ` : ''}
                              {l.authored} authored · {l.coauthored} co{l.passed ? ` · ${l.passed} passed` : ''}
                            </span>
                            {!l.inOffice ? (
                              <span className="text-rep-fg">left office</span>
                            ) : l.email ? (
                              <a
                                href={`mailto:${l.email}`}
                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                              >
                                <Mail className="h-3 w-3" aria-hidden /> email
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              <Globe className="mr-1 inline h-3 w-3" aria-hidden />
              Alignment is scored across all sessions: <span className="text-foreground">authored ×3 + coauthored + passed
              ×2</span>. <span className="font-medium text-foreground">Champion</span> = led a measure;{' '}
              <span className="font-medium text-foreground">Strong Ally</span> / <span className="font-medium text-foreground">Ally</span> /{' '}
              <span className="font-medium text-foreground">Supporter</span> by score. “left office” = no same-name member
              sits in the current Legislature.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RegionChip({
  active,
  adjacent,
  label,
  onClick,
}: {
  active: boolean;
  adjacent?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : adjacent
            ? 'border-dem/30 bg-dem-soft/50 text-dem-fg hover:bg-dem-soft'
            : 'border-border bg-card text-muted-foreground hover:bg-accent',
      )}
    >
      {label}
    </button>
  );
}
