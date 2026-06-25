import { useQuery } from '@tanstack/react-query';
import { FA_REGION_BY_KEY, matchRegions } from '@legiapp/shared';
import { Command } from 'cmdk';
import { Building2, FileText, Globe, Users } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Snippet } from '@/components/common';
import { api } from '@/lib/api';
import { chamberLabel, partyMeta } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { useStateCtx } from '@/lib/state';

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const navigate = useNavigate();
  const { state } = useStateCtx();
  const { experimentalFeatures } = useSettings();

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', state, debounced],
    queryFn: () => api.search(debounced),
    enabled: open && debounced.length >= 2,
  });

  const go = (path: string) => {
    onOpenChange(false);
    setQ('');
    navigate(path);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <Command
        shouldFilter={false}
        className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          autoFocus
          value={q}
          onValueChange={setQ}
          placeholder="Search members, bills, committees…"
          className="w-full border-b bg-transparent px-4 py-3.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {debounced.length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type at least 2 characters…</p>
          ) : isFetching && !data ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : (
            <>
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results for “{debounced}”.
              </Command.Empty>

              {(() => {
                const regionKey = experimentalFeatures ? matchRegions(debounced)[0] : undefined;
                const fa = regionKey ? FA_REGION_BY_KEY.get(regionKey) : undefined;
                return fa ? (
                  <Command.Group heading="Tracker" className="px-1 text-xs font-medium text-muted-foreground">
                    <Command.Item
                      value="fa-tracker"
                      onSelect={() => go(`/foreign-affairs?region=${fa.key}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                    >
                      <Globe className="h-4 w-4 text-dem" />
                      <span className="flex-1">
                        Open <span className="font-medium">{fa.label}</span> in the Foreign Affairs tracker
                      </span>
                    </Command.Item>
                  </Command.Group>
                ) : null;
              })()}

              {data?.legislators.length ? (
                <Command.Group heading="Legislators" className="px-1 text-xs font-medium text-muted-foreground">
                  {data.legislators.map((l) => (
                    <Command.Item
                      key={l.id}
                      value={`leg-${l.id}`}
                      onSelect={() => go(`/legislators/${l.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{l.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {partyMeta(l.party).code} · {chamberLabel(l.chamber)} {l.district}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {data?.bills.length ? (
                <Command.Group heading="Bills" className="px-1 text-xs font-medium text-muted-foreground">
                  {data.bills.map((b) => (
                    <Command.Item
                      key={b.id}
                      value={`bill-${b.id}`}
                      onSelect={() => go(`/bills/${b.id}`)}
                      className="flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                    >
                      <div className="flex w-full items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{b.identifier}</span>
                        <span className="flex-1 truncate text-muted-foreground">
                          {b.title ?? <span className="italic">Resolution</span>}
                        </span>
                      </div>
                      {b.matchSnippet ? (
                        <div className="line-clamp-1 pl-6">
                          <Snippet text={b.matchSnippet} />
                        </div>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {data?.committees.length ? (
                <Command.Group heading="Committees" className="px-1 text-xs font-medium text-muted-foreground">
                  {data.committees.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`cmte-${c.id}`}
                      onSelect={() => go(`/committees/${c.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{chamberLabel(c.chamber)}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </>
          )}
        </Command.List>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>{isFetching ? 'searching…' : 'ready'}</span>
        </div>
      </Command>
    </div>
  );
}
