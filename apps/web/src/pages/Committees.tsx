import { useQuery } from '@tanstack/react-query';
import { Building2, Download, Users } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader } from '@/components/common';
import { Badge, Button, Input, Select, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { chamberLabel } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { downloadWorkbook } from '@/lib/xlsx';

export default function Committees() {
  const [chamber, setChamber] = React.useState('');
  const [q, setQ] = React.useState('');
  const sl = useStateLabels();
  const { state } = useStateCtx();

  const qs = new URLSearchParams();
  if (chamber) qs.set('chamber', chamber);
  if (q) qs.set('q', q);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['committees', state, qs.toString()],
    queryFn: () => api.committees(qs.toString()),
  });

  const [isExporting, setIsExporting] = React.useState(false);
  // Fetches the full committee × member roster on demand (so "which member is on
  // which committee" exports even though the list view only shows counts).
  const exportXlsx = async () => {
    setIsExporting(true);
    try {
      const memberships = await api.committeeMemberships();
      const roleLabel = (r: string) => (r === 'chair' ? 'Chair' : r === 'vice_chair' ? 'Vice chair' : 'Member');
      await downloadWorkbook(`legiapp-${state.toLowerCase()}-committees.xlsx`, [
        {
          name: 'Memberships',
          columns: [
            { header: 'Committee', key: 'committee', width: 40 },
            { header: 'Chamber', key: 'chamber', width: 14 },
            { header: 'Type', key: 'type', width: 14 },
            { header: 'Member', key: 'member', width: 24 },
            { header: 'Party', key: 'party', width: 14 },
            { header: 'District', key: 'district', width: 12 },
            { header: 'Role', key: 'role', width: 12 },
          ],
          rows: memberships.map((m) => ({
            committee: m.committeeName,
            chamber: m.committeeChamber ? chamberLabel(m.committeeChamber) : '',
            type: m.type ?? '',
            member: m.fullName,
            party: m.party ?? '',
            district: m.districtLabel ?? m.district ?? '',
            role: roleLabel(m.role),
          })),
        },
        {
          name: 'Committees',
          columns: [
            { header: 'Committee', key: 'committee', width: 40 },
            { header: 'Chamber', key: 'chamber', width: 14 },
            { header: 'Type', key: 'type', width: 14 },
            { header: 'Members', key: 'members', width: 10 },
          ],
          rows: (data ?? []).map((c) => ({
            committee: c.name,
            chamber: c.chamber ? chamberLabel(c.chamber) : '',
            type: c.type ?? '',
            members: c.memberCount,
          })),
        },
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Committees"
        subtitle="Standing committees where bills are heard and voted before reaching the floor."
      >
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={isExporting}>
          <Download className="h-4 w-4" /> {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Search committees…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select aria-label="Filter by chamber" value={chamber} onChange={(e) => setChamber(e.target.value)}>
          <option value="">All chambers</option>
          <option value="assembly">{sl.lowerLabel}</option>
          <option value="senate">{sl.upperLabel}</option>
        </Select>
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : data?.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No committees found.</p>
          ) : (
            data?.map((c) => (
              <Link
                key={c.id}
                to={`/committees/${c.id}`}
                className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <Badge className="bg-secondary text-secondary-foreground">{chamberLabel(c.chamber)}</Badge>
                </div>
                <h3 className="mt-3 font-medium leading-snug group-hover:text-primary">{c.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {c.memberCount > 0 ? `${c.memberCount} members` : 'Roster unavailable'}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
