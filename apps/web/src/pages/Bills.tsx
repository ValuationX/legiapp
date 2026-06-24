import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ErrorState,
  LoadingRows,
  PageHeader,
  Pagination,
  Snippet,
  SourceBadge,
  StatusBadge,
} from '@/components/common';
import { BILL_STATUS_BUCKET_LABELS, type BillStatusBucket } from '@legiapp/shared';
import { Input, Select } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { chamberLabel, formatDate } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';

export default function Bills() {
  const [chamber, setChamber] = React.useState('');
  const [measureType, setMeasureType] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 25;
  const sl = useStateLabels();
  const { state } = useStateCtx();

  React.useEffect(() => setPage(1), [chamber, measureType, status, subject, q]);

  const facets = useQuery({ queryKey: ['bill-facets', state], queryFn: api.billFacets });

  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (chamber) qs.set('chamber', chamber);
  if (measureType) qs.set('measureType', measureType);
  if (status) qs.set('canonicalStatus', status);
  if (subject) qs.set('subject', subject);
  if (q) qs.set('q', q);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['bills', state, qs.toString()],
    queryFn: () => api.bills(qs.toString()),
  });

  return (
    <div>
      <PageHeader title="Bills" subtitle={`Measures in the current ${sl.name} legislative session.`} />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search number or title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select aria-label="Filter by chamber" value={chamber} onChange={(e) => setChamber(e.target.value)}>
          <option value="">All chambers</option>
          <option value="assembly">{sl.lowerLabel}</option>
          <option value="senate">{sl.upperLabel}</option>
        </Select>
        <Select aria-label="Filter by bill type" value={measureType} onChange={(e) => setMeasureType(e.target.value)}>
          <option value="">All types</option>
          {facets.data?.measureTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {facets.data?.statusBuckets.map((b) => (
            <option key={b} value={b}>
              {BILL_STATUS_BUCKET_LABELS[b as BillStatusBucket]}
            </option>
          ))}
        </Select>
        {facets.data?.subjects?.length ? (
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject">
            <option value="">All subjects</option>
            {facets.data.subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead>
              <TR>
                <TH className="w-20">Bill</TH>
                <TH>Title</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Origin</TH>
                <TH className="hidden sm:table-cell">Last action</TH>
                <TH className="hidden md:table-cell">Source</TH>
              </TR>
            </THead>
            <TBody>
              {isLoading ? (
                <LoadingRows rows={12} cols={6} />
              ) : data?.items.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-10 text-center text-muted-foreground">
                    No bills match these filters.
                  </TD>
                </TR>
              ) : (
                data?.items.map((b) => (
                  <TR key={b.id}>
                    <TD>
                      <Link to={`/bills/${b.id}`} className="font-semibold text-primary hover:underline">
                        {b.identifier}
                      </Link>
                    </TD>
                    <TD className="max-w-md">
                      <Link to={`/bills/${b.id}`} className="line-clamp-2 text-sm hover:underline">
                        {b.title ?? <span className="text-muted-foreground italic">Resolution</span>}
                      </Link>
                      {b.matchSnippet ? (
                        <div className="mt-0.5 line-clamp-1">
                          <Snippet text={b.matchSnippet} />
                        </div>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusBadge status={b.status} />
                    </TD>
                    <TD className="hidden text-sm md:table-cell">{chamberLabel(b.chamberOfOrigin)}</TD>
                    <TD className="hidden text-sm tabular text-muted-foreground sm:table-cell">
                      {formatDate(b.lastActionDate)}
                    </TD>
                    <TD className="hidden md:table-cell">
                      <SourceBadge source={b.source} lastVerified={b.lastVerified} conflict={b.conflict} />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      )}

      {data ? <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} /> : null}
    </div>
  );
}
