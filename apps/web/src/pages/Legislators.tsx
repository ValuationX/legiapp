import type { LegislatorSummary } from '@legiapp/shared';
import { useQuery } from '@tanstack/react-query';
import { Download, LayoutGrid, Table as TableIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingRows, MemberAvatar, MemberCell, PageHeader, PartyBadge, SourceBadge } from '@/components/common';
import { Badge, Button, Input, Select, Skeleton } from '@/components/ui/primitives';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { chamberLabel, partyMeta } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { cn } from '@/lib/utils';
import { downloadWorkbook } from '@/lib/xlsx';

export default function Legislators() {
  const [chamber, setChamber] = React.useState('');
  const [party, setParty] = React.useState('');
  const [reelection, setReelection] = React.useState('');
  const [q, setQ] = React.useState('');
  const [view, setView] = React.useState<'gallery' | 'table'>('gallery');
  const [sort, setSort] = React.useState<'district' | 'party' | 'name'>('district');
  const [isExporting, setIsExporting] = React.useState(false);
  const sl = useStateLabels();
  const { state } = useStateCtx();

  // Roster fits one page (largest state is PA at 253) — fetch all, render without pagination.
  const qs = new URLSearchParams({ pageSize: '300' });
  if (chamber) qs.set('chamber', chamber);
  if (party) qs.set('party', party);
  if (reelection) qs.set('reelectionYear', reelection);
  if (q) qs.set('q', q);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['legislators', state, qs.toString()],
    queryFn: () => api.legislators(qs.toString()),
  });
  const items = data?.items ?? [];

  const sorted = React.useMemo(() => {
    const rank = (p?: string | null) => {
      const c = partyMeta(p ?? '').code;
      return c === 'D' ? 0 : c === 'R' ? 1 : 2;
    };
    const arr = [...items];
    if (sort === 'party') {
      arr.sort((a, b) => rank(a.party) - rank(b.party) || (a.lastName ?? '').localeCompare(b.lastName ?? ''));
    } else if (sort === 'name') {
      arr.sort((a, b) => (a.lastName ?? '').localeCompare(b.lastName ?? ''));
    } else {
      arr.sort((a, b) => (a.chamber ?? '').localeCompare(b.chamber ?? '') || (a.district ?? 0) - (b.district ?? 0));
    }
    return arr;
  }, [items, sort]);

  const exportXlsx = async () => {
    if (!sorted.length) return;
    setIsExporting(true);
    try {
      await downloadWorkbook(`legiapp-${state.toLowerCase()}-legislators.xlsx`, [
        {
          name: 'Legislators',
          columns: [
            { header: 'Name', key: 'name', width: 26 },
            { header: 'Party', key: 'party', width: 14 },
            { header: 'Chamber', key: 'chamber', width: 14 },
            { header: 'District', key: 'district', width: 12 },
            { header: 'Leadership role(s)', key: 'roles', width: 28 },
            { header: 'In office', key: 'inOffice', width: 10 },
            { header: 'Next election', key: 'nextElection', width: 13 },
            { header: 'Source', key: 'source', width: 14 },
          ],
          rows: sorted.map((l) => ({
            name: l.fullName,
            party: l.party ?? '',
            chamber: chamberLabel(l.chamber),
            district: l.districtLabel ?? l.district ?? '',
            roles: l.leadershipRoles.map((r) => r.role).join(', '),
            inOffice: l.inOffice ? 'Yes' : 'No',
            nextElection: l.nextElectionYear ?? '',
            source: l.source,
          })),
        },
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Legislators" subtitle={`All ${sl.seatTotal} members of the ${sl.name} ${sl.lowerLabel} and ${sl.upperLabel}.`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={isExporting || !sorted.length}>
            <Download className="h-4 w-4" /> {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <div className="inline-flex rounded-md border bg-card p-1">
            <ViewBtn active={view === 'gallery'} onClick={() => setView('gallery')} icon={LayoutGrid} />
            <ViewBtn active={view === 'table'} onClick={() => setView('table')} icon={TableIcon} />
          </div>
        </div>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={chamber} onChange={(e) => setChamber(e.target.value)}>
          <option value="">All chambers</option>
          <option value="assembly">{sl.lowerLabel}</option>
          <option value="senate">{sl.upperLabel}</option>
        </Select>
        <Select value={party} onChange={(e) => setParty(e.target.value)}>
          <option value="">All parties</option>
          <option value="Democratic">Democratic</option>
          <option value="Republican">Republican</option>
        </Select>
        <Select value={reelection} onChange={(e) => setReelection(e.target.value)} title="Next election">
          <option value="">Any election cycle</option>
          <option value="2026">Up for reelection 2026</option>
          <option value="2028">Up for reelection 2028</option>
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'district' | 'party' | 'name')}
          title="Sort order"
          className="sm:ml-auto"
        >
          <option value="district">Sort: District</option>
          <option value="party">Sort: Party</option>
          <option value="name">Sort: Name</option>
        </Select>
      </div>

      {!isLoading && items.length > 0 ? <Composition items={items} /> : null}

      {isError ? (
        <ErrorState error={error} />
      ) : view === 'gallery' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : sorted.map((l) => <MemberGalleryCard key={l.id} l={l} />)}
          {!isLoading && items.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No legislators match.</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead>
              <TR>
                <TH>Member</TH>
                <TH>Party</TH>
                <TH className="hidden md:table-cell">Chamber</TH>
                <TH>District</TH>
                <TH className="hidden md:table-cell">Role</TH>
                <TH className="hidden md:table-cell">Source</TH>
              </TR>
            </THead>
            <TBody>
              {isLoading ? (
                <LoadingRows rows={10} cols={6} />
              ) : (
                sorted.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <MemberCell id={l.id} name={l.fullName} photoUrl={l.photoUrl} party={l.party} chamber={l.chamber} />
                    </TD>
                    <TD>
                      <PartyBadge party={l.party} />
                    </TD>
                    <TD className="hidden text-sm md:table-cell">{chamberLabel(l.chamber)}</TD>
                    <TD className="tabular text-sm">{l.districtLabel ?? l.district}</TD>
                    <TD className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {l.leadershipRoles.map((r) => (
                          <Badge key={r.role} className="bg-primary/10 text-primary ring-1 ring-primary/20">
                            {r.role}
                          </Badge>
                        ))}
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <SourceBadge source={l.source} lastVerified={l.lastVerified} conflict={l.conflict} />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, icon: Icon }: { active: boolean; onClick: () => void; icon: typeof LayoutGrid }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded transition-colors sm:h-7 sm:w-7',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MemberGalleryCard({ l }: { l: LegislatorSummary }) {
  return (
    <Link
      to={`/legislators/${l.id}`}
      className="group rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar name={l.fullName} photoUrl={l.photoUrl} party={l.party} size={56} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-tight group-hover:text-primary">{l.fullName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {chamberLabel(l.chamber)} · {l.districtLabel ?? `District ${l.district}`}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <PartyBadge party={l.party} />
            {l.leadershipRoles.map((r) => (
              <Badge key={r.role} className="bg-primary/10 text-primary ring-1 ring-primary/20">
                {r.role}
              </Badge>
            ))}
            {l.nextElectionYear ? (
              <Badge className="bg-secondary text-secondary-foreground ring-1 ring-border" title="Next election">
                ↻ {l.nextElectionYear}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Composition({ items }: { items: LegislatorSummary[] }) {
  const d = items.filter((i) => partyMeta(i.party).code === 'D').length;
  const r = items.filter((i) => partyMeta(i.party).code === 'R').length;
  const o = items.length - d - r;
  const total = Math.max(items.length, 1);
  return (
    <div className="mb-4 rounded-lg border bg-card p-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        <div className="bg-dem" style={{ width: `${(d / total) * 100}%` }} />
        <div className="bg-rep" style={{ width: `${(r / total) * 100}%` }} />
        {o > 0 ? <div className="bg-muted-foreground/40" style={{ width: `${(o / total) * 100}%` }} /> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-dem" /> <b className="tabular">{d}</b> Democratic
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rep" /> <b className="tabular">{r}</b> Republican
        </span>
        {o > 0 ? <span className="text-muted-foreground">{o} vacant/other</span> : null}
        <span className="ml-auto text-muted-foreground tabular">{items.length} members</span>
      </div>
    </div>
  );
}
