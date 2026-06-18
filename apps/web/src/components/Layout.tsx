import {
  Building2,
  CalendarDays,
  FileText,
  Globe,
  LayoutDashboard,
  Landmark,
  Map,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile backdrop — tap to close */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-card',
          'transition-[transform,margin] duration-200 ease-in-out md:static',
          open ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">LegiApp for Nova Ukraine</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Ukraine legislative tracker</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          Created by <span className="font-medium text-foreground">Arseniy Shafran</span> as an informational tool to aid
          research. This site aggregates public data and by no means should replace human input.
        </div>
      </aside>
    </>
  );
}

function Topbar({ onSearch, onToggleNav }: { onSearch: () => void; onToggleNav: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-6">
      <button
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/40"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search members, bills, committees…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
    </header>
  );
}

export function Layout() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  // Open by default on desktop, closed on phones.
  const [navOpen, setNavOpen] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const location = useLocation();

  // Close the drawer after navigating on mobile so it doesn't cover the content.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setNavOpen(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onSearch={() => setSearchOpen(true)} onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
