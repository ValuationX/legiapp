import { AlertTriangle, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/ui/primitives';
import { TD, TR } from '@/components/ui/table';
import { chamberLabel, formatRelative, initials, partyMeta, statusTone } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PartyBadge({ party }: { party: string | null | undefined }) {
  const p = partyMeta(party);
  return (
    <Badge className={p.badge} title={p.label}>
      <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} aria-hidden />
      {p.code}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge className={statusTone(status)}>{status}</Badge>;
}

/** Source + freshness badge — the spec's traceability contract, on every record. */
export function SourceBadge({
  source,
  lastVerified,
  conflict,
}: {
  source: string;
  lastVerified?: string | null;
  conflict?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {conflict ? (
        <AlertTriangle className="h-3 w-3 text-nay" />
      ) : (
        <ShieldCheck className="h-3 w-3 text-yea/70" />
      )}
      <span className="font-medium uppercase tracking-wide">{source}</span>
      {lastVerified ? <span className="text-muted-foreground/70">· {formatRelative(lastVerified)}</span> : null}
    </span>
  );
}

export function MemberAvatar({
  name,
  photoUrl,
  party,
  size = 40,
}: {
  name: string;
  photoUrl?: string | null;
  party?: string | null;
  size?: number;
}) {
  const [broken, setBroken] = React.useState(false);
  const p = partyMeta(party);
  const showImg = photoUrl && !broken;
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border',
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={photoUrl}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
      <span className={cn('absolute bottom-0 left-0 right-0 h-1', p.dot)} aria-hidden />
    </div>
  );
}

/** Horizontal Aye/No/Other vote bar. */
export function VoteBar({
  ayes,
  noes,
  abstain,
}: {
  ayes: number | null;
  noes: number | null;
  abstain: number | null;
}) {
  const a = ayes ?? 0;
  const n = noes ?? 0;
  const o = abstain ?? 0;
  const total = Math.max(a + n + o, 1);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" title={`Aye ${a} · No ${n} · Other ${o}`}>
      <div className="bg-yea" style={{ width: `${(a / total) * 100}%` }} />
      <div className="bg-nay" style={{ width: `${(n / total) * 100}%` }} />
      <div className="bg-muted-foreground/30" style={{ width: `${(o / total) * 100}%` }} />
    </div>
  );
}

/** Renders a ts_headline snippet, bolding the «matched» terms. */
export function Snippet({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  const parts = text.split(/«|»/);
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-yea/15 px-0.5 font-medium text-foreground">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="mt-1 max-w-md text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-nay/30 bg-nay/5 p-4 text-sm text-nay">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-xs opacity-80">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  );
}

export function LoadingRows({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TR key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <TD key={c}>
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </TD>
          ))}
        </TR>
      ))}
    </>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
      <span className="tabular">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="tabular text-xs">
          {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function MemberCell({
  id,
  name,
  photoUrl,
  party,
  chamber,
  district,
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  party?: string | null;
  chamber?: string | null;
  district?: number | null;
}) {
  return (
    <Link to={`/legislators/${id}`} className="flex items-center gap-3 hover:underline">
      <MemberAvatar name={name} photoUrl={photoUrl} party={party} size={32} />
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">
          {chamberLabel(chamber as never)} {district ? `· District ${district}` : ''}
        </div>
      </div>
    </Link>
  );
}
