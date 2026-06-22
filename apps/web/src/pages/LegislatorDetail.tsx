import { useQuery } from '@tanstack/react-query';
import { FA_REGION_BY_KEY } from '@legiapp/shared';
import { ArrowLeft, Building2, Globe, Mail, MapPin, Phone } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, MemberAvatar, PartyBadge, SourceBadge, StatusBadge } from '@/components/common';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { chamberLabel, formatDate, partyColor, stanceMeta, voteOptionMeta } from '@/lib/format';

export default function LegislatorDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = React.useState<'bills' | 'votes'>('bills');

  const leg = useQuery({ queryKey: ['legislator', id], queryFn: () => api.legislator(id) });
  const bills = useQuery({ queryKey: ['legislator-bills', id], queryFn: () => api.legislatorBills(id) });
  const votes = useQuery({ queryKey: ['legislator-votes', id], queryFn: () => api.legislatorVotes(id) });

  const { showForeignAffairs } = useSettings();
  if (leg.isError) return <ErrorState error={leg.error} />;
  const l = leg.data;
  const faBills = showForeignAffairs ? (bills.data ?? []).filter((b) => (b.faRegions?.length ?? 0) > 0) : [];

  return (
    <div>
      <Link to="/legislators" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Legislators
      </Link>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Profile sidebar */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="h-1.5" style={{ background: l ? partyColor(l.party) : 'hsl(var(--border))' }} />
            <CardContent className="p-5">
              {!l ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <MemberAvatar name={l.fullName} photoUrl={l.photoUrl} party={l.party} size={64} />
                    <div className="min-w-0">
                      <h1 className="text-lg font-semibold leading-tight">{l.fullName}</h1>
                      <div className="mt-1 flex items-center gap-2">
                        <PartyBadge party={l.party} />
                        <span className="text-sm text-muted-foreground">
                          {chamberLabel(l.chamber)} · District {l.district}
                        </span>
                      </div>
                      {!l.inOffice ? (
                        <Badge className="mt-1.5 bg-rep-soft text-rep-fg ring-1 ring-rep/25">Former member</Badge>
                      ) : l.nextElectionYear ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Next election:{' '}
                          <span className="font-medium text-foreground">{l.nextElectionYear}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {l.leadershipRoles.length ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {l.leadershipRoles.map((r) => (
                        <Badge key={r.role} className="bg-primary/10 text-primary ring-1 ring-primary/20">
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {l.inOffice ? (
                    <div className="mt-4 space-y-2 text-sm">
                      <ContactRow
                        icon={Mail}
                        value={l.email}
                        fallback="Email not available"
                        href={l.email ? `mailto:${l.email}` : undefined}
                      />
                      <ContactRow
                        icon={Phone}
                        value={l.phone}
                        fallback="Phone not available"
                        href={l.phone ? `tel:${l.phone.replace(/[^0-9+]/g, '')}` : undefined}
                      />
                      <ContactRow icon={MapPin} value={l.office} fallback="Office not available" />
                      {l.office || l.phone ? (
                        <p className="pl-6 text-xs text-muted-foreground">
                          The Capitol office reaches the member's staff (chief of staff, scheduler, legislative director).
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-md border border-rep/30 bg-rep-soft/40 px-3 py-2 text-sm text-rep-fg">
                      No longer in office — contact details are for current members only.
                    </div>
                  )}

                  <div className="mt-4 border-t pt-3">
                    <SourceBadge source={l.source} lastVerified={l.lastVerified} conflict={l.conflict} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Committees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!l ? (
                <Skeleton className="h-16 w-full" />
              ) : l.committees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Committee roster not yet synced from chamber sites.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {l.committees.map((c) => (
                    <li key={c.committeeId} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/committees/${c.committeeId}`} className="hover:underline">
                        {c.committeeName}
                      </Link>
                      {c.role !== 'member' ? (
                        <Badge className="bg-primary/10 text-primary ring-1 ring-primary/20">
                          {c.role === 'vice_chair' ? 'Vice Chair' : 'Chair'}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {!l ? (
                <Skeleton className="h-10 w-full" />
              ) : l.positions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tracked positions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {l.positions.map((p) => (
                    <li key={p.topic} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.topic}</span>
                        <Badge className={stanceMeta(p.stance).badge}>{stanceMeta(p.stance).label}</Badge>
                        {p.billId ? (
                          <Link to={`/bills/${p.billId}`} className="text-xs text-primary hover:underline">
                            {p.billIdentifier}
                          </Link>
                        ) : null}
                      </div>
                      {p.note ? <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity */}
        <div>
          {faBills.length > 0 ? (
            <Card className="mb-4 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Ukraine &amp; Foreign-Affairs bills ({faBills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {faBills.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-2 border-b pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <Link to={`/bills/${b.id}`} className="font-semibold text-primary hover:underline">
                      {b.identifier}
                    </Link>
                    <Badge
                      className={
                        b.sponsorType === 'primary'
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'bg-secondary text-secondary-foreground'
                      }
                    >
                      {b.sponsorType === 'primary' ? 'Lead author' : 'Co-author'}
                    </Badge>
                    {(b.faRegions ?? []).map((r) => (
                      <Badge key={r} className="bg-dem-soft text-dem-fg ring-1 ring-dem/25">
                        {FA_REGION_BY_KEY.get(r)?.label ?? r}
                      </Badge>
                    ))}
                    <span className="line-clamp-1 min-w-0 flex-1 text-muted-foreground">{b.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <div className="mb-3 inline-flex rounded-md border bg-card p-1 text-sm">
            <TabButton active={tab === 'bills'} onClick={() => setTab('bills')}>
              Sponsored bills {l ? `(${l.sponsoredCount})` : ''}
            </TabButton>
            <TabButton active={tab === 'votes'} onClick={() => setTab('votes')}>
              Recent votes
            </TabButton>
          </div>

          <div className="rounded-lg border bg-card">
            {tab === 'bills' ? (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-20">Bill</TH>
                    <TH>Title</TH>
                    <TH>Role</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {bills.isLoading ? (
                    <SkeletonRows cols={4} />
                  ) : bills.data?.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                        No sponsored bills.
                      </TD>
                    </TR>
                  ) : (
                    bills.data?.map((b) => (
                      <TR key={b.id}>
                        <TD>
                          <Link to={`/bills/${b.id}`} className="font-semibold text-primary hover:underline">
                            {b.identifier}
                          </Link>
                        </TD>
                        <TD className="max-w-sm">
                          <span className="line-clamp-2 text-sm">{b.title}</span>
                        </TD>
                        <TD>
                          <Badge
                            className={
                              b.sponsorType === 'primary'
                                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                : 'bg-secondary text-secondary-foreground'
                            }
                          >
                            {b.sponsorType === 'primary' ? 'Lead' : 'Co'}
                          </Badge>
                        </TD>
                        <TD>
                          <StatusBadge status={b.status} />
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-24">Vote</TH>
                    <TH className="w-20">Bill</TH>
                    <TH>Motion</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {votes.isLoading ? (
                    <SkeletonRows cols={4} />
                  ) : votes.data?.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                        No recorded votes.
                      </TD>
                    </TR>
                  ) : (
                    votes.data?.map((v) => {
                      const opt = voteOptionMeta(v.option);
                      return (
                        <TR key={v.voteEventId}>
                          <TD>
                            <Link to={`/votes/${v.voteEventId}`} className={`font-semibold hover:underline ${opt.className}`}>
                              {opt.label}
                            </Link>
                          </TD>
                          <TD>
                            <Link to={`/bills/${v.billId}`} className="text-primary hover:underline">
                              {v.billIdentifier}
                            </Link>
                          </TD>
                          <TD className="max-w-sm">
                            <span className="line-clamp-1 text-sm text-muted-foreground">
                              {v.motion ?? (v.isFloor ? 'Floor vote' : 'Committee vote')}
                            </span>
                          </TD>
                          <TD className="whitespace-nowrap text-sm tabular text-muted-foreground">
                            {formatDate(v.date)}
                          </TD>
                        </TR>
                      );
                    })
                  )}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  fallback,
  href,
}: {
  icon: typeof Mail;
  value: string | null;
  fallback: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      {value ? (
        href ? (
          <a href={href} className="min-w-0 break-words text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="min-w-0 break-words">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground/70">{fallback}</span>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1.5 font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, r) => (
        <TR key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <TD key={c}>
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </TD>
          ))}
        </TR>
      ))}
    </>
  );
}
