import { Building2, CalendarDays, FileText, Globe, LayoutDashboard, Landmark, Map, Search, Users } from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { SearchPalette } from '@/components/SearchPalette';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'This Week', icon: LayoutDashboard, end: true },
  { to: '/foreign-affairs', label: 'Ukraine & Foreign Affairs', icon: Globe },
  { to: '/bills', label: 'Bills', icon: FileText },
  { to: '/legislators', label: 'Legislators', icon: Users },
  { to: '/committees', label: 'Committees', icon: Building2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/map', label: 'District Map', icon: Map },
];

function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <Link to="/" className="flex items-center gap-2 border-b px-5 py-4 hover:bg-accent/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Landmark className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">LegiApp for Nova Ukraine</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Ukraine legislative tracker</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Created by <span className="font-medium text-foreground">Arseniy Shafran</span> as an informational tool to aid
        research. This site aggregates public data and by no means should replace human input.
      </div>
    </aside>
  );
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/40"
      >
        <Search className="h-4 w-4" />
        <span>Search members, bills, committees…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}

export function Layout() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onSearch={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      <SearchPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
