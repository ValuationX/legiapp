import { FA_REGION_BY_KEY } from '@legiapp/shared';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader, PartyBadge } from '@/components/common';
import { Button, Skeleton } from '@/components/ui/primitives';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, type LeadershipRow } from '@/lib/api';
import { chamberLabel } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { downloadWorkbook } from '@/lib/xlsx';

export default function Leadership() {
  const sl = useStateLabels();
  const { state } = useStateCtx();
  const { showForeignAffairs } = useSettings();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['leadership', state], queryFn: api.leadership });
  if (isError) return <ErrorState error={error} />;

  const rows = data ?? [];
  const senate = rows.filter((r) => r.chamber === 'senate');
  const assembly = rows.filter((r) => r.chamber === 'assembly');

  const [isExporting, setIsExporting] = React.useState(false);
  const exportXlsx = async () => {
    if (!rows.length) return;
    setIsExporting(true);
    try {
      await downloadWorkbook(`legiapp-${state.toLowerCase()}-leadership.xlsx`, [
        {
          name: 'Leadership',
          columns: [
            { header: 'Role', key: 'role', width: 28 },
            { header: 'Member', key: 'member', width: 24 },
            { header: 'Party', key: 'party', width: 14 },
            { header: 'Chamber', key: 'chamber', width: 14 },
            { header: 'District', key: 'district', width: 12 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Phone', key: 'phone', width: 16 },
            { header: 'Ukraine & FA bills', key: 'faBills', width: 40 },
          ],
          rows: rows.map((r) => ({
            role: r.role,
            member: r.fullName,
            party: r.party ?? '',
            chamber: r.chamber ? chamberLabel(r.chamber) : '',
            district: r.districtLabel ?? r.district ?? '',
            email: r.email ?? '',
            phone: r.phone ?? '',
            faBills: r.faBills.map((b) => b.identifier).join(', '),
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
        title="Leadership"
        subtitle={`Who controls the agenda in the ${sl.name} Legislature${showForeignAffairs ? " — with each leader's Ukraine & foreign-affairs record" : ''}.`}
      >
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={isExporting || !rows.length}>
          <Download className="h-4 w-4" /> {isExporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </PageHeader>
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

function MemberName({ r }: { r: LeadershipRow }) {
  return r.legislatorId ? (
    <Link to={`/legislators/${r.legislatorId}`} className="font-medium text-primary hover:underline">
      {r.fullName}
    </Link>
  ) : (
    <span className="font-medium">{r.fullName}</span>
  );
}

function FaBillChips({ bills }: { bills: LeadershipRow['faBills'] }) {
  if (!bills.length) return <span className="text-xs text-muted-foreground">No record</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {bills.map((b) => (
        <Link
          key={b.id}
          to={`/bills/${b.id}`}
          title={`${b.type === 'primary' ? 'Lead author' : 'Co-author'}${
            b.regions?.length ? ` · ${b.regions.map((x) => FA_REGION_BY_KEY.get(x)?.label ?? x).join(', ')}` : ''
          }`}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs hover:bg-accent ${
            b.type === 'primary' ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border'
          }`}
        >
          {b.identifier}
          <span className="text-[10px] uppercase text-muted-foreground">{b.type === 'primary' ? 'lead' : 'co'}</span>
        </Link>
      ))}
    </div>
  );
}

function Section({ title, rows, showFA }: { title: string; rows: LeadershipRow[]; showFA: boolean }) {
  if (!rows.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
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
                  <MemberName r={r} />
                  {r.party ? (
                    <span className="ml-2 align-middle">
                      <PartyBadge party={r.party} />
                    </span>
                  ) : null}
                </TD>
                <TD className="text-sm tabular text-muted-foreground">{r.districtLabel ?? r.district ?? '—'}</TD>
                {showFA ? (
                  <TD>
                    <FaBillChips bills={r.faBills} />
                  </TD>
                ) : null}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {/* Mobile: stacked cards (the table's fixed columns + FA column don't fit a phone) */}
      <div className="space-y-2 md:hidden">
        {rows.map((r, i) => (
          <div key={`m-${r.role}-${r.legislatorId}-${i}`} className="rounded-lg border bg-card p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{r.role}</div>
            <div className="mt-1 flex items-center gap-2">
              <MemberName r={r} />
              {r.party ? <PartyBadge party={r.party} /> : null}
              <span className="ml-auto text-xs tabular text-muted-foreground">
                {r.districtLabel ?? r.district ?? '—'}
              </span>
            </div>
            {showFA ? (
              <div className="mt-2">
                <FaBillChips bills={r.faBills} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
