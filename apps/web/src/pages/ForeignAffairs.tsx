import { useQuery } from '@tanstack/react-query';
import type { FaSponsor, ForeignAffairsBill } from '@legiapp/shared';
import { ChevronDown, Download, Flag, Globe, Mail, Trophy, UserX } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/common';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { alignmentMeta, formatDate, partyMeta, statusMeta } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { downloadWorkbook } from '@/lib/xlsx';
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
  const { state } = useStateCtx();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['foreign-affairs', state, region],
    queryFn: () => api.foreignAffairs(region ? `region=${region}` : ''),
  });

  const [leaderSort, setLeaderSort] = React.useState<'activity' | 'party'>('activity');
  const [leaderOpen, setLeaderOpen] = React.useState(false);
  const [chamber, setChamber] = React.useState<'' | 'assembly' | 'senate'>('');
  const [leaderQuery, setLeaderQuery] = React.useState('');
  const [billQuery, setBillQuery] = React.useState('');
  const [billSort, setBillSort] = React.useState<'recent' | 'coauthors' | 'signed'>('recent');

  const visibleBills = React.useMemo(() => {
    let arr = (data?.bills ?? []).filter((b) => !chamber || b.chamberOfOrigin === chamber);
    const ql = billQuery.trim().toLowerCase();
    if (ql) {
      arr = arr.filter((b) => b.identifier.toLowerCase().includes(ql) || (b.title ?? '').toLowerCase().includes(ql));
    }
    const recency = (b: ForeignAffairsBill) => (b.lastActionDate ? Date.parse(b.lastActionDate) : 0);
    return [...arr].sort((a, b) => {
      if (billSort === 'coauthors') return b.coauthors.length - a.coauthors.length || recency(b) - recency(a);
      if (billSort === 'signed') return Number(b.signed) - Number(a.signed) || recency(b) - recency(a);
      return recency(b) - recency(a);
    });
  }, [data?.bills, chamber, billQuery, billSort]);

  const leaders = React.useMemo(() => {
    let arr = data?.leaders ? [...data.leaders] : [];
    if (chamber) arr = arr.filter((l) => l.chamber === chamber);
    if (leaderQuery.trim()) {
      const ql = leaderQuery.trim().toLowerCase();
      arr = arr.filter((l) => l.name.toLowerCase().includes(ql));
    }
    if (leaderSort === 'party') {
      const rank = (p?: string | null) => {
        const c = partyMeta(p ?? '').code;
        return c === 'D' ? 0 : c === 'R' ? 1 : 2;
      };
      arr.sort((a, b) => rank(a.party) - rank(b.party)); // stable sort keeps score order within a party
    }
    return arr;
  }, [data?.leaders, leaderSort, chamber, leaderQuery]);

  const suffixParts = [region, chamber].filter(Boolean);
  const suffix = suffixParts.length ? `-${suffixParts.join('-')}` : '';
  const [isExporting, setIsExporting] = React.useState(false);

  // One formatted .xlsx workbook: Bills + Allies + About sheets. Reflects the active
  // region/chamber filters and the current bill search/sort (it reads visibleBills/leaders).
  const exportXlsx = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const regionLabel = data.regions.find((r) => r.key === region)?.label ?? 'All regions';
      const chamberLabel = chamber ? (chamber === 'senate' ? sl.upperLabel : sl.lowerLabel) : 'Both';
      await downloadWorkbook(`legiapp-ukraine${suffix}.xlsx`, [
        {
          name: 'Bills',
          columns: [
            { header: 'Bill', key: 'bill', width: 12 },
            { header: 'Session', key: 'session', width: 12 },
            { header: 'Title', key: 'title', width: 60 },
            { header: 'Region(s)', key: 'regions', width: 18 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Signed', key: 'signed', width: 9 },
            { header: 'Authors', key: 'authors', width: 30 },
            { header: 'Coauthors', key: 'coauthors', width: 40 },
            { header: 'Ayes', key: 'ayes', width: 7 },
            { header: 'Noes', key: 'noes', width: 7 },
          ],
          rows: visibleBills.map((b) => ({
            bill: b.identifier,
            session: b.session,
            title: b.title ?? '',
            regions: b.regions.join(', '),
            status: b.status ? statusMeta(b.status).label : '',
            signed: b.signed ? 'Yes' : 'No',
            authors: b.authors.map((a) => a.name).join(', '),
            coauthors: b.coauthors.map((c) => `${c.name}${c.currentlyInOffice ? '' : ' (left office)'}`).join(', '),
            ayes: b.ayes ?? '',
            noes: b.noes ?? '',
          })),
        },
        {
          name: 'Allies',
          columns: [
            { header: 'Legislator', key: 'name', width: 26 },
            { header: 'Party', key: 'party', width: 14 },
            { header: 'Chamber', key: 'chamber', width: 12 },
            { header: 'Alignment', key: 'alignment', width: 14 },
            { header: 'Score', key: 'score', width: 8 },
            { header: 'Authored', key: 'authored', width: 10 },
            { header: 'Coauthored', key: 'coauthored', width: 12 },
            { header: 'Passed', key: 'passed', width: 9 },
            { header: 'In office', key: 'inOffice', width: 10 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Phone', key: 'phone', width: 16 },
          ],
          rows: leaders.map((l) => ({
            name: l.name,
            party: l.party ?? '',
            chamber: l.chamber ?? '',
            alignment: alignmentMeta(l.level).label,
            score: l.score,
            authored: l.authored,
            coauthored: l.coauthored,
            passed: l.passed,
            inOffice: l.inOffice ? 'Yes' : 'No',
            email: l.email ?? '',
            phone: l.phone ?? '',
          })),
        },
        {
          name: 'About',
          columns: [
            { header: 'Field', key: 'field', width: 22 },
            { header: 'Value', key: 'value', width: 50 },
          ],
          rows: [
            { field: 'Export', value: 'Bill Aid — Ukraine & Foreign Affairs' },
            { field: 'State', value: sl.name },
            { field: 'Region filter', value: regionLabel },
            { field: 'Chamber filter', value: chamberLabel },
            { field: 'Bill search', value: billQuery.trim() || '(none)' },
            { field: 'Bills exported', value: visibleBills.length },
            { field: 'Allies exported', value: leaders.length },
            { field: 'Exported (UTC)', value: new Date().toISOString().slice(0, 10) },
            { field: 'Source', value: 'Official legislative records, via Bill Aid' },
          ],
        },
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ukraine & Foreign Affairs"
        subtitle={`Ukraine and Ukraine-adjacent ${sl.name} measures across recent sessions — who authored, coauthored, and signed on, including allies who have since left office.`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={exportXlsx}
          disabled={isExporting || (!visibleBills.length && !leaders.length)}
        >
          <Download className="h-4 w-4" /> {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
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
              ['assembly', sl.lowerLabel],
              ['senate', sl.upperLabel],
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
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={billQuery}
                onChange={(e) => setBillQuery(e.target.value)}
                placeholder="Search bills by number or title…"
                className="max-w-xs"
                aria-label="Search foreign-affairs bills"
              />
              <Select
                value={billSort}
                onChange={(e) => setBillSort(e.target.value as 'recent' | 'coauthors' | 'signed')}
                title="Sort bills"
                className="sm:ml-auto"
              >
                <option value="recent">Sort: Recent</option>
                <option value="coauthors">Sort: Most coauthors</option>
                <option value="signed">Sort: Signed first</option>
              </Select>
            </div>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
            ) : !visibleBills.length ? (
              <EmptyState
                title="No measures found"
                hint={
                  billQuery.trim()
                    ? `No measures match “${billQuery.trim()}”.`
                    : chamber
                      ? `No ${chamber === 'senate' ? sl.upperLabel : sl.lowerLabel} measures for the current filters.`
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
                <button
                  type="button"
                  onClick={() => setLeaderOpen((v) => !v)}
                  aria-expanded={leaderOpen}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Most active legislators
                    <span className="text-xs font-normal text-muted-foreground">({data?.leaders?.length ?? 0})</span>
                  </CardTitle>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      leaderOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
                {leaderOpen ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-end">
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
                    <Input
                      value={leaderQuery}
                      onChange={(e) => setLeaderQuery(e.target.value)}
                      placeholder="Search legislators by name…"
                      className="h-8 text-sm"
                      aria-label="Search legislators"
                    />
                  </div>
                ) : null}
              </CardHeader>
              {leaderOpen ? (
              <CardContent className="max-h-[60vh] space-y-0.5 overflow-y-auto">
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
                              {l.chamber ? `${l.chamber === 'senate' ? sl.upperLabel : sl.lowerLabel} · ` : ''}
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
              ) : null}
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
