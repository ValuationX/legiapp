import { useQuery } from '@tanstack/react-query';
import { Building2, Users } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader } from '@/components/common';
import { Badge, Input, Select, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { chamberLabel } from '@/lib/format';

export default function Committees() {
  const [chamber, setChamber] = React.useState('');
  const [q, setQ] = React.useState('');

  const qs = new URLSearchParams();
  if (chamber) qs.set('chamber', chamber);
  if (q) qs.set('q', q);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['committees', qs.toString()],
    queryFn: () => api.committees(qs.toString()),
  });

  return (
    <div>
      <PageHeader
        title="Committees"
        subtitle="Standing committees where bills are heard and voted before reaching the floor."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Search committees…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select aria-label="Filter by chamber" value={chamber} onChange={(e) => setChamber(e.target.value)}>
          <option value="">All chambers</option>
          <option value="assembly">Assembly</option>
          <option value="senate">Senate</option>
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
